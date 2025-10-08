const db = require('../config/database');

class PaymentRecordModel {
    /**
     * 수납 등록
     * @param {number} academyId 학원 ID
     * @param {Object} data 수납 데이터
     * @returns {Promise<Object>} 생성된 수납 기록
     */
    static async create(academyId, data) {
        const {
            student_id,
            charge_id,
            payment_date,
            amount,
            payment_method = 'cash',
            receipt_number,
            card_number_masked,
            bank_name,
            depositor_name,
            notes,
            processed_by
        } = data;

        const query = `
            INSERT INTO payment_records (
                academy_id, student_id, charge_id, payment_date, amount,
                payment_method, receipt_number, card_number_masked,
                bank_name, depositor_name, notes, processed_by, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
        `;

        const [result] = await db.execute(query, [
            academyId,
            student_id,
            charge_id || null,
            payment_date,
            amount,
            payment_method,
            receipt_number || null,
            card_number_masked || null,
            bank_name || null,
            depositor_name || null,
            notes || null,
            processed_by || null
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...data,
            status: 'completed'
        };
    }

    /**
     * 수납 조회
     * @param {number} academyId 학원 ID
     * @param {number} paymentId 수납 ID
     * @returns {Promise<Object|null>} 수납 정보
     */
    static async findById(academyId, paymentId) {
        const query = `
            SELECT pr.*, s.name as student_name, s.phone as student_phone,
                   u.name as processor_name
            FROM payment_records pr
            LEFT JOIN students s ON pr.student_id = s.id
            LEFT JOIN users u ON pr.processed_by = u.id
            WHERE pr.academy_id = ? AND pr.id = ?
        `;

        const [rows] = await db.execute(query, [academyId, paymentId]);
        return rows[0] || null;
    }

    /**
     * 학생별 수납 내역 조회
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {Object} filters 필터
     * @returns {Promise<Array>} 수납 목록
     */
    static async findByStudent(academyId, studentId, filters = {}) {
        let query = `
            SELECT pr.*, sc.charge_date, sc.final_amount as charge_amount,
                   bi.name as item_name
            FROM payment_records pr
            LEFT JOIN student_charges sc ON pr.charge_id = sc.id
            LEFT JOIN billing_items bi ON sc.billing_item_id = bi.id
            WHERE pr.academy_id = ? AND pr.student_id = ?
        `;

        const params = [academyId, studentId];

        if (filters.status) {
            query += ' AND pr.status = ?';
            params.push(filters.status);
        }

        if (filters.from_date) {
            query += ' AND DATE(pr.payment_date) >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND DATE(pr.payment_date) <= ?';
            params.push(filters.to_date);
        }

        if (filters.payment_method) {
            query += ' AND pr.payment_method = ?';
            params.push(filters.payment_method);
        }

        query += ' ORDER BY pr.payment_date DESC, pr.id DESC';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 날짜별 수납 조회
     * @param {number} academyId 학원 ID
     * @param {string} date YYYY-MM-DD 형식
     * @returns {Promise<Array>} 수납 목록
     */
    static async findByDate(academyId, date) {
        const query = `
            SELECT pr.*, s.name as student_name, s.grade, s.school,
                   u.name as processor_name
            FROM payment_records pr
            LEFT JOIN students s ON pr.student_id = s.id
            LEFT JOIN users u ON pr.processed_by = u.id
            WHERE pr.academy_id = ?
            AND DATE(pr.payment_date) = ?
            AND pr.status = 'completed'
            ORDER BY pr.payment_date DESC
        `;

        const [rows] = await db.execute(query, [academyId, date]);
        return rows;
    }

    /**
     * 기간별 수납 조회
     * @param {number} academyId 학원 ID
     * @param {string} fromDate 시작일
     * @param {string} toDate 종료일
     * @returns {Promise<Array>} 수납 목록
     */
    static async findByPeriod(academyId, fromDate, toDate) {
        const query = `
            SELECT pr.*, s.name as student_name, s.grade, s.school,
                   u.name as processor_name
            FROM payment_records pr
            LEFT JOIN students s ON pr.student_id = s.id
            LEFT JOIN users u ON pr.processed_by = u.id
            WHERE pr.academy_id = ?
            AND DATE(pr.payment_date) BETWEEN ? AND ?
            AND pr.status = 'completed'
            ORDER BY pr.payment_date DESC
        `;

        const [rows] = await db.execute(query, [academyId, fromDate, toDate]);
        return rows;
    }

    /**
     * 영수증 번호로 조회
     * @param {number} academyId 학원 ID
     * @param {string} receiptNumber 영수증 번호
     * @returns {Promise<Object|null>} 수납 정보
     */
    static async findByReceiptNumber(academyId, receiptNumber) {
        const query = `
            SELECT pr.*, s.name as student_name, s.phone as student_phone
            FROM payment_records pr
            LEFT JOIN students s ON pr.student_id = s.id
            WHERE pr.academy_id = ? AND pr.receipt_number = ?
        `;

        const [rows] = await db.execute(query, [academyId, receiptNumber]);
        return rows[0] || null;
    }

    /**
     * 수납 취소
     * @param {number} academyId 학원 ID
     * @param {number} paymentId 수납 ID
     * @param {Object} cancelData 취소 정보
     * @returns {Promise<boolean>} 취소 성공 여부
     */
    static async cancel(academyId, paymentId, cancelData) {
        const {
            cancelled_by,
            cancelled_reason
        } = cancelData;

        const query = `
            UPDATE payment_records
            SET status = 'cancelled',
                cancelled_at = NOW(),
                cancelled_by = ?,
                cancelled_reason = ?
            WHERE academy_id = ? AND id = ?
            AND status = 'completed'
        `;

        const [result] = await db.execute(query, [
            cancelled_by,
            cancelled_reason,
            academyId,
            paymentId
        ]);

        return result.affectedRows > 0;
    }

    /**
     * 일별 수납 통계
     * @param {number} academyId 학원 ID
     * @param {string} date YYYY-MM-DD 형식
     * @returns {Promise<Object>} 통계 정보
     */
    static async getDailyStatistics(academyId, date) {
        const query = `
            SELECT
                COUNT(DISTINCT student_id) as paid_students,
                COUNT(*) as payment_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_amount,
                SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as card_amount,
                SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END) as transfer_amount,
                SUM(CASE WHEN payment_method = 'auto_transfer' THEN amount ELSE 0 END) as auto_transfer_amount
            FROM payment_records
            WHERE academy_id = ?
            AND DATE(payment_date) = ?
            AND status = 'completed'
        `;

        const [rows] = await db.execute(query, [academyId, date]);
        return rows[0];
    }

    /**
     * 월별 수납 통계
     * @param {number} academyId 학원 ID
     * @param {string} month YYYY-MM 형식
     * @returns {Promise<Object>} 통계 정보
     */
    static async getMonthlyStatistics(academyId, month) {
        const query = `
            SELECT
                COUNT(DISTINCT student_id) as paid_students,
                COUNT(*) as payment_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_amount,
                SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as card_amount,
                SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END) as transfer_amount,
                SUM(CASE WHEN payment_method = 'auto_transfer' THEN amount ELSE 0 END) as auto_transfer_amount,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
                SUM(CASE WHEN status = 'cancelled' THEN amount ELSE 0 END) as cancelled_amount
            FROM payment_records
            WHERE academy_id = ?
            AND DATE_FORMAT(payment_date, '%Y-%m') = ?
        `;

        const [rows] = await db.execute(query, [academyId, month]);
        return rows[0];
    }

    /**
     * 기간별 수납 통계
     * @param {number} academyId 학원 ID
     * @param {string} fromDate 시작일
     * @param {string} toDate 종료일
     * @returns {Promise<Object>} 통계 정보
     */
    static async getPeriodStatistics(academyId, fromDate, toDate) {
        const query = `
            SELECT
                COUNT(DISTINCT student_id) as paid_students,
                COUNT(*) as payment_count,
                SUM(amount) as total_amount,
                SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_amount,
                SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as card_amount,
                SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END) as transfer_amount,
                SUM(CASE WHEN payment_method = 'auto_transfer' THEN amount ELSE 0 END) as auto_transfer_amount
            FROM payment_records
            WHERE academy_id = ?
            AND DATE(payment_date) BETWEEN ? AND ?
            AND status = 'completed'
        `;

        const [rows] = await db.execute(query, [academyId, fromDate, toDate]);
        return rows[0];
    }

    /**
     * 청구에 대한 수납 내역 조회
     * @param {number} academyId 학원 ID
     * @param {number} chargeId 청구 ID
     * @returns {Promise<Array>} 수납 목록
     */
    static async findByCharge(academyId, chargeId) {
        const query = `
            SELECT pr.*, u.name as processor_name
            FROM payment_records pr
            LEFT JOIN users u ON pr.processed_by = u.id
            WHERE pr.academy_id = ? AND pr.charge_id = ?
            ORDER BY pr.payment_date DESC
        `;

        const [rows] = await db.execute(query, [academyId, chargeId]);
        return rows;
    }

    /**
     * 영수증 번호 생성
     * @param {number} academyId 학원 ID
     * @returns {Promise<string>} 영수증 번호
     */
    static async generateReceiptNumber(academyId) {
        const today = new Date().toISOString().split('T')[0].replace(/-/g, '');

        const query = `
            SELECT COUNT(*) as count
            FROM payment_records
            WHERE academy_id = ?
            AND DATE(payment_date) = CURDATE()
        `;

        const [rows] = await db.execute(query, [academyId]);
        const count = rows[0].count + 1;

        return `R${today}-${String(count).padStart(4, '0')}`;
    }
}

module.exports = PaymentRecordModel;