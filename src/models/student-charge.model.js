const db = require('../config/database');

class StudentChargeModel {
    /**
     * 학생 청구 생성
     * @param {number} academyId 학원 ID
     * @param {Object} data 청구 데이터
     * @returns {Promise<Object>} 생성된 청구
     */
    static async create(academyId, data) {
        const {
            student_id,
            invoice_id,
            billing_item_id,
            charge_date,
            amount,
            discount_amount = 0,
            discount_reason,
            due_date,
            notes
        } = data;

        const final_amount = amount - discount_amount;

        const query = `
            INSERT INTO student_charges (
                academy_id, student_id, invoice_id, billing_item_id,
                charge_date, amount, discount_amount, discount_reason,
                final_amount, due_date, notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        const [result] = await db.execute(query, [
            academyId,
            student_id,
            invoice_id || null,
            billing_item_id || null,
            charge_date,
            amount,
            discount_amount,
            discount_reason || null,
            final_amount,
            due_date || null,
            notes || null
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...data,
            final_amount,
            status: 'pending'
        };
    }

    /**
     * 여러 학생에게 일괄 청구 생성
     * @param {number} academyId 학원 ID
     * @param {Array} studentIds 학생 ID 목록
     * @param {Object} chargeData 청구 데이터
     * @returns {Promise<Array>} 생성된 청구 목록
     */
    static async bulkCreate(academyId, studentIds, chargeData) {
        const charges = [];
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const studentId of studentIds) {
                const data = {
                    ...chargeData,
                    student_id: studentId
                };

                const charge = await this.create(academyId, data);
                charges.push(charge);
            }

            await connection.commit();
            return charges;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 청구 조회
     * @param {number} academyId 학원 ID
     * @param {number} chargeId 청구 ID
     * @returns {Promise<Object|null>} 청구 정보
     */
    static async findById(academyId, chargeId) {
        const query = `
            SELECT sc.*, s.name as student_name, s.phone as student_phone,
                   bi.name as item_name, bi.category as item_category
            FROM student_charges sc
            LEFT JOIN students s ON sc.student_id = s.id
            LEFT JOIN billing_items bi ON sc.billing_item_id = bi.id
            WHERE sc.academy_id = ? AND sc.id = ?
        `;

        const [rows] = await db.execute(query, [academyId, chargeId]);
        return rows[0] || null;
    }

    /**
     * 학생별 청구 내역 조회
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {Object} filters 필터
     * @returns {Promise<Array>} 청구 목록
     */
    static async findByStudent(academyId, studentId, filters = {}) {
        let query = `
            SELECT sc.*, bi.name as item_name, bi.category as item_category
            FROM student_charges sc
            LEFT JOIN billing_items bi ON sc.billing_item_id = bi.id
            WHERE sc.academy_id = ? AND sc.student_id = ?
        `;

        const params = [academyId, studentId];

        if (filters.status) {
            query += ' AND sc.status = ?';
            params.push(filters.status);
        }

        if (filters.from_date) {
            query += ' AND sc.charge_date >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND sc.charge_date <= ?';
            params.push(filters.to_date);
        }

        query += ' ORDER BY sc.charge_date DESC, sc.id DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 미납 청구 조회
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터
     * @returns {Promise<Array>} 미납 청구 목록
     */
    static async findUnpaid(academyId, filters = {}) {
        let query = `
            SELECT sc.*, s.name as student_name, s.phone as student_phone,
                   s.parent_phone, bi.name as item_name
            FROM student_charges sc
            LEFT JOIN students s ON sc.student_id = s.id
            LEFT JOIN billing_items bi ON sc.billing_item_id = bi.id
            WHERE sc.academy_id = ?
            AND sc.status IN ('pending', 'partial', 'overdue')
            AND sc.remaining_amount > 0
        `;

        const params = [academyId];

        if (filters.student_id) {
            query += ' AND sc.student_id = ?';
            params.push(filters.student_id);
        }

        if (filters.overdue_only) {
            query += ' AND sc.due_date < CURDATE()';
        }

        query += ' ORDER BY sc.due_date, sc.charge_date';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 월별 청구 조회
     * @param {number} academyId 학원 ID
     * @param {string} month YYYY-MM 형식
     * @returns {Promise<Array>} 청구 목록
     */
    static async findByMonth(academyId, month) {
        const query = `
            SELECT sc.*, s.name as student_name, s.grade, s.school,
                   bi.name as item_name, bi.category as item_category
            FROM student_charges sc
            LEFT JOIN students s ON sc.student_id = s.id
            LEFT JOIN billing_items bi ON sc.billing_item_id = bi.id
            WHERE sc.academy_id = ?
            AND DATE_FORMAT(sc.charge_date, '%Y-%m') = ?
            ORDER BY s.name, sc.charge_date
        `;

        const [rows] = await db.execute(query, [academyId, month]);
        return rows;
    }

    /**
     * 청구 상태 업데이트
     * @param {number} academyId 학원 ID
     * @param {number} chargeId 청구 ID
     * @param {string} status 상태
     * @returns {Promise<boolean>} 업데이트 성공 여부
     */
    static async updateStatus(academyId, chargeId, status) {
        const query = `
            UPDATE student_charges
            SET status = ?
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [status, academyId, chargeId]);
        return result.affectedRows > 0;
    }

    /**
     * 청구 수정
     * @param {number} academyId 학원 ID
     * @param {number} chargeId 청구 ID
     * @param {Object} data 수정 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    static async update(academyId, chargeId, data) {
        const fields = [];
        const values = [];

        const updatableFields = [
            'amount', 'discount_amount', 'discount_reason',
            'due_date', 'notes', 'status'
        ];

        updatableFields.forEach(field => {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        });

        // final_amount 재계산
        if (data.amount !== undefined || data.discount_amount !== undefined) {
            // 현재 값 조회
            const current = await this.findById(academyId, chargeId);
            if (current) {
                const amount = data.amount !== undefined ? data.amount : current.amount;
                const discount = data.discount_amount !== undefined ? data.discount_amount : current.discount_amount;
                fields.push('final_amount = ?');
                values.push(amount - discount);
            }
        }

        if (fields.length === 0) {
            return false;
        }

        const query = `
            UPDATE student_charges
            SET ${fields.join(', ')}
            WHERE academy_id = ? AND id = ?
        `;

        values.push(academyId, chargeId);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * 청구 취소
     * @param {number} academyId 학원 ID
     * @param {number} chargeId 청구 ID
     * @param {string} reason 취소 사유
     * @returns {Promise<boolean>} 취소 성공 여부
     */
    static async cancel(academyId, chargeId, reason) {
        const query = `
            UPDATE student_charges
            SET status = 'cancelled', notes = CONCAT(IFNULL(notes, ''), '\n취소: ', ?)
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [reason, academyId, chargeId]);
        return result.affectedRows > 0;
    }

    /**
     * 청구 통계
     * @param {number} academyId 학원 ID
     * @param {string} month YYYY-MM 형식
     * @returns {Promise<Object>} 통계 정보
     */
    static async getMonthlyStatistics(academyId, month) {
        const query = `
            SELECT
                COUNT(DISTINCT student_id) as charged_students,
                COUNT(*) as total_charges,
                SUM(amount) as total_amount,
                SUM(discount_amount) as total_discount,
                SUM(final_amount) as total_final_amount,
                SUM(paid_amount) as total_paid,
                SUM(remaining_amount) as total_remaining,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_count,
                COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count
            FROM student_charges
            WHERE academy_id = ?
            AND DATE_FORMAT(charge_date, '%Y-%m') = ?
        `;

        const [rows] = await db.execute(query, [academyId, month]);
        return rows[0];
    }

    /**
     * 학생별 미납 총액 조회
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @returns {Promise<number>} 미납 총액
     */
    static async getTotalUnpaidByStudent(academyId, studentId) {
        const query = `
            SELECT COALESCE(SUM(remaining_amount), 0) as total_unpaid
            FROM student_charges
            WHERE academy_id = ? AND student_id = ?
            AND status IN ('pending', 'partial', 'overdue')
        `;

        const [rows] = await db.execute(query, [academyId, studentId]);
        return rows[0].total_unpaid;
    }
}

module.exports = StudentChargeModel;