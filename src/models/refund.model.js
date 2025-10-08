const db = require('../config/database');

class RefundModel {
    /**
     * 환불 신청 생성
     * @param {number} academyId 학원 ID
     * @param {Object} data 환불 데이터
     * @returns {Promise<Object>} 생성된 환불 신청
     */
    static async create(academyId, data) {
        const {
            student_id,
            payment_id,
            refund_date,
            amount,
            refund_method = 'cash',
            reason,
            bank_name,
            account_number,
            account_holder,
            processed_by,
            notes
        } = data;

        const query = `
            INSERT INTO refund_records (
                academy_id, student_id, payment_id, refund_date,
                amount, refund_method, reason, bank_name,
                account_number, account_holder, status,
                processed_by, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        `;

        const [result] = await db.execute(query, [
            academyId,
            student_id,
            payment_id,
            refund_date || new Date(),
            amount,
            refund_method,
            reason,
            bank_name || null,
            account_number || null,
            account_holder || null,
            processed_by || null,
            notes || null
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...data,
            status: 'pending'
        };
    }

    /**
     * 환불 목록 조회
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터
     * @returns {Promise<Array>} 환불 목록
     */
    static async findAll(academyId, filters = {}) {
        let query = `
            SELECT r.*, s.name as student_name, s.phone as student_phone,
                   p.amount as original_amount, p.payment_date,
                   p.payment_method as original_method,
                   u1.name as processor_name, u2.name as approver_name
            FROM refund_records r
            LEFT JOIN students s ON r.student_id = s.id
            LEFT JOIN payment_records p ON r.payment_id = p.id
            LEFT JOIN users u1 ON r.processed_by = u1.id
            LEFT JOIN users u2 ON r.approved_by = u2.id
            WHERE r.academy_id = ?
        `;

        const params = [academyId];

        if (filters.status) {
            query += ' AND r.status = ?';
            params.push(filters.status);
        }

        if (filters.student_id) {
            query += ' AND r.student_id = ?';
            params.push(filters.student_id);
        }

        if (filters.from_date) {
            query += ' AND DATE(r.refund_date) >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND DATE(r.refund_date) <= ?';
            params.push(filters.to_date);
        }

        query += ' ORDER BY r.refund_date DESC, r.id DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 환불 상세 조회
     * @param {number} academyId 학원 ID
     * @param {number} refundId 환불 ID
     * @returns {Promise<Object|null>} 환불 정보
     */
    static async findById(academyId, refundId) {
        const query = `
            SELECT r.*, s.name as student_name, s.phone as student_phone,
                   p.amount as original_amount, p.payment_date,
                   p.receipt_number, p.payment_method as original_method,
                   u1.name as processor_name, u2.name as approver_name
            FROM refund_records r
            LEFT JOIN students s ON r.student_id = s.id
            LEFT JOIN payment_records p ON r.payment_id = p.id
            LEFT JOIN users u1 ON r.processed_by = u1.id
            LEFT JOIN users u2 ON r.approved_by = u2.id
            WHERE r.academy_id = ? AND r.id = ?
        `;

        const [rows] = await db.execute(query, [academyId, refundId]);
        return rows[0] || null;
    }

    /**
     * 환불 승인
     * @param {number} academyId 학원 ID
     * @param {number} refundId 환불 ID
     * @param {number} approverId 승인자 ID
     * @returns {Promise<boolean>} 승인 성공 여부
     */
    static async approve(academyId, refundId, approverId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // 환불 정보 조회
            const [refundResult] = await connection.execute(
                'SELECT * FROM refund_records WHERE academy_id = ? AND id = ? AND status = "pending"',
                [academyId, refundId]
            );

            if (refundResult.length === 0) {
                throw new Error('환불 신청을 찾을 수 없거나 이미 처리되었습니다.');
            }

            const refund = refundResult[0];

            // 환불 승인 처리
            await connection.execute(
                `UPDATE refund_records
                SET status = 'completed', approved_by = ?, approved_at = NOW()
                WHERE id = ?`,
                [approverId, refundId]
            );

            // 원 수납 기록 업데이트
            if (refund.payment_id) {
                await connection.execute(
                    'UPDATE payment_records SET status = "refunded" WHERE id = ?',
                    [refund.payment_id]
                );

                // 관련 청구 상태 업데이트
                const [paymentResult] = await connection.execute(
                    'SELECT charge_id FROM payment_records WHERE id = ?',
                    [refund.payment_id]
                );

                if (paymentResult[0]?.charge_id) {
                    // 청구의 수납액 재계산
                    await connection.execute(
                        `UPDATE student_charges sc
                        SET sc.paid_amount = (
                            SELECT COALESCE(SUM(pr.amount), 0)
                            FROM payment_records pr
                            WHERE pr.charge_id = sc.id
                            AND pr.status = 'completed'
                        ),
                        sc.status = CASE
                            WHEN sc.paid_amount >= sc.final_amount THEN 'paid'
                            WHEN sc.paid_amount > 0 THEN 'partial'
                            WHEN sc.due_date < CURDATE() THEN 'overdue'
                            ELSE 'pending'
                        END
                        WHERE sc.id = ?`,
                        [paymentResult[0].charge_id]
                    );
                }
            }

            await connection.commit();
            return true;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 환불 거절
     * @param {number} academyId 학원 ID
     * @param {number} refundId 환불 ID
     * @param {string} reason 거절 사유
     * @returns {Promise<boolean>} 거절 성공 여부
     */
    static async reject(academyId, refundId, reason) {
        const query = `
            UPDATE refund_records
            SET status = 'rejected',
                notes = CONCAT(IFNULL(notes, ''), '\n거절사유: ', ?)
            WHERE academy_id = ? AND id = ? AND status = 'pending'
        `;

        const [result] = await db.execute(query, [reason, academyId, refundId]);
        return result.affectedRows > 0;
    }

    /**
     * 환불 통계
     * @param {number} academyId 학원 ID
     * @param {string} month YYYY-MM 형식
     * @returns {Promise<Object>} 환불 통계
     */
    static async getStatistics(academyId, month) {
        const query = `
            SELECT
                COUNT(*) as total_refunds,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
                SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_refunded,
                AVG(CASE WHEN status = 'completed' THEN amount END) as average_refund,
                COUNT(DISTINCT CASE WHEN status = 'completed' THEN student_id END) as refunded_students
            FROM refund_records
            WHERE academy_id = ?
            AND DATE_FORMAT(refund_date, '%Y-%m') = ?
        `;

        const [rows] = await db.execute(query, [academyId, month]);

        // 환불 사유별 집계
        const [reasonStats] = await db.execute(`
            SELECT reason, COUNT(*) as count, SUM(amount) as total_amount
            FROM refund_records
            WHERE academy_id = ?
            AND DATE_FORMAT(refund_date, '%Y-%m') = ?
            AND status = 'completed'
            GROUP BY reason
            ORDER BY count DESC
        `, [academyId, month]);

        return {
            summary: rows[0],
            by_reason: reasonStats
        };
    }
}

module.exports = RefundModel;