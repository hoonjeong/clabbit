const db = require('../config/database');
const crypto = require('crypto');

class AutoPaymentModel {
    constructor() {
        // 암호화 키 (실제로는 환경변수로 관리)
        this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    }

    /**
     * 계좌번호 암호화
     */
    encrypt(text) {
        const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * 계좌번호 복호화
     */
    decrypt(encrypted) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', this.encryptionKey);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            return '****-****-****';
        }
    }

    /**
     * 자동이체 정보 등록
     * @param {number} academyId 학원 ID
     * @param {Object} data 자동이체 데이터
     * @returns {Promise<Object>} 등록된 자동이체 정보
     */
    async create(academyId, data) {
        const {
            student_id,
            bank_name,
            account_number,
            account_holder,
            withdrawal_day,
            monthly_amount,
            start_date,
            end_date,
            consent_file_path,
            notes
        } = data;

        // 계좌번호 암호화
        const encryptedAccount = account_number ? this.encrypt(account_number) : null;

        // 기존 활성 자동이체 비활성화
        await db.execute(
            'UPDATE auto_payment_info SET is_active = FALSE WHERE academy_id = ? AND student_id = ? AND is_active = TRUE',
            [academyId, student_id]
        );

        const query = `
            INSERT INTO auto_payment_info (
                academy_id, student_id, bank_name, account_number_encrypted,
                account_holder, withdrawal_day, monthly_amount, is_active,
                start_date, end_date, consent_file_path, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            academyId,
            student_id,
            bank_name,
            encryptedAccount,
            account_holder,
            withdrawal_day,
            monthly_amount,
            start_date,
            end_date || null,
            consent_file_path || null,
            notes || null
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...data,
            account_number: '****-****-' + account_number.slice(-4)
        };
    }

    /**
     * 자동이체 목록 조회
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터
     * @returns {Promise<Array>} 자동이체 목록
     */
    async findAll(academyId, filters = {}) {
        let query = `
            SELECT ap.*, s.name as student_name, s.grade, s.school,
                   s.phone as student_phone, s.parent_phone
            FROM auto_payment_info ap
            LEFT JOIN students s ON ap.student_id = s.id
            WHERE ap.academy_id = ?
        `;

        const params = [academyId];

        if (filters.is_active !== undefined) {
            query += ' AND ap.is_active = ?';
            params.push(filters.is_active);
        }

        if (filters.withdrawal_day) {
            query += ' AND ap.withdrawal_day = ?';
            params.push(filters.withdrawal_day);
        }

        query += ' ORDER BY ap.is_active DESC, s.name';

        const [rows] = await db.execute(query, params);

        // 계좌번호 마스킹
        return rows.map(row => ({
            ...row,
            account_number_masked: row.account_number_encrypted
                ? '****-****-' + this.decrypt(row.account_number_encrypted).slice(-4)
                : null
        }));
    }

    /**
     * 자동이체 상세 조회
     * @param {number} academyId 학원 ID
     * @param {number} autoPaymentId 자동이체 ID
     * @returns {Promise<Object|null>} 자동이체 정보
     */
    async findById(academyId, autoPaymentId) {
        const query = `
            SELECT ap.*, s.name as student_name, s.grade, s.school,
                   s.phone as student_phone, s.parent_phone
            FROM auto_payment_info ap
            LEFT JOIN students s ON ap.student_id = s.id
            WHERE ap.academy_id = ? AND ap.id = ?
        `;

        const [rows] = await db.execute(query, [academyId, autoPaymentId]);

        if (rows.length === 0) {
            return null;
        }

        const autoPayment = rows[0];

        // 계좌번호 복호화 (권한이 있는 경우만)
        return {
            ...autoPayment,
            account_number_masked: autoPayment.account_number_encrypted
                ? '****-****-' + this.decrypt(autoPayment.account_number_encrypted).slice(-4)
                : null
        };
    }

    /**
     * 오늘 출금 대상 조회
     * @param {number} academyId 학원 ID
     * @param {number} day 출금일
     * @returns {Promise<Array>} 출금 대상 목록
     */
    async findTodayWithdrawals(academyId, day = new Date().getDate()) {
        const today = new Date().toISOString().split('T')[0];

        const query = `
            SELECT ap.*, s.name as student_name, s.grade, s.school
            FROM auto_payment_info ap
            LEFT JOIN students s ON ap.student_id = s.id
            WHERE ap.academy_id = ?
            AND ap.is_active = TRUE
            AND ap.withdrawal_day = ?
            AND ap.start_date <= ?
            AND (ap.end_date IS NULL OR ap.end_date >= ?)
            AND s.status = 'active'
        `;

        const [rows] = await db.execute(query, [academyId, day, today, today]);
        return rows;
    }

    /**
     * 자동이체 수정
     * @param {number} academyId 학원 ID
     * @param {number} autoPaymentId 자동이체 ID
     * @param {Object} data 수정할 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    async update(academyId, autoPaymentId, data) {
        const fields = [];
        const values = [];

        const updatableFields = [
            'bank_name', 'account_holder', 'withdrawal_day',
            'monthly_amount', 'is_active', 'end_date', 'notes'
        ];

        updatableFields.forEach(field => {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        });

        // 계좌번호 변경
        if (data.account_number) {
            fields.push('account_number_encrypted = ?');
            values.push(this.encrypt(data.account_number));
        }

        if (fields.length === 0) {
            return false;
        }

        const query = `
            UPDATE auto_payment_info
            SET ${fields.join(', ')}
            WHERE academy_id = ? AND id = ?
        `;

        values.push(academyId, autoPaymentId);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * 자동이체 해지
     * @param {number} academyId 학원 ID
     * @param {number} autoPaymentId 자동이체 ID
     * @param {string} endDate 해지일
     * @returns {Promise<boolean>} 해지 성공 여부
     */
    async terminate(academyId, autoPaymentId, endDate = null) {
        const query = `
            UPDATE auto_payment_info
            SET is_active = FALSE, end_date = ?
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [
            endDate || new Date().toISOString().split('T')[0],
            academyId,
            autoPaymentId
        ]);

        return result.affectedRows > 0;
    }

    /**
     * 자동이체 처리 기록
     * @param {number} academyId 학원 ID
     * @param {Object} withdrawalData 출금 데이터
     * @returns {Promise<Object>} 처리 결과
     */
    async processWithdrawal(academyId, withdrawalData) {
        const {
            auto_payment_id,
            student_id,
            amount,
            withdrawal_date
        } = withdrawalData;

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // 자동이체 정보 확인
            const [autoPayment] = await connection.execute(
                'SELECT * FROM auto_payment_info WHERE id = ? AND academy_id = ? AND is_active = TRUE',
                [auto_payment_id, academyId]
            );

            if (autoPayment.length === 0) {
                throw new Error('자동이체 정보를 찾을 수 없습니다.');
            }

            // 수납 기록 생성
            const PaymentRecordModel = require('./payment-record.model');
            const payment = await PaymentRecordModel.create(academyId, {
                student_id: student_id,
                payment_date: withdrawal_date,
                amount: amount,
                payment_method: 'auto_transfer',
                notes: `자동이체 출금 (${new Date().getMonth() + 1}월)`,
                processed_by: null // 시스템 자동 처리
            });

            // 마지막 출금일 업데이트
            await connection.execute(
                'UPDATE auto_payment_info SET last_payment_date = ? WHERE id = ?',
                [withdrawal_date, auto_payment_id]
            );

            await connection.commit();

            return {
                success: true,
                payment_id: payment.id
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 자동이체 통계
     * @param {number} academyId 학원 ID
     * @param {string} month YYYY-MM 형식
     * @returns {Promise<Object>} 자동이체 통계
     */
    async getStatistics(academyId, month) {
        const [stats] = await db.execute(`
            SELECT
                COUNT(DISTINCT CASE WHEN is_active = TRUE THEN student_id END) as active_count,
                COUNT(DISTINCT student_id) as total_count,
                SUM(CASE WHEN is_active = TRUE THEN monthly_amount ELSE 0 END) as total_monthly_amount,
                AVG(CASE WHEN is_active = TRUE THEN monthly_amount END) as average_amount,
                COUNT(DISTINCT CASE WHEN is_active = TRUE THEN withdrawal_day END) as withdrawal_days
            FROM auto_payment_info
            WHERE academy_id = ?
        `, [academyId]);

        // 출금일별 분포
        const [dayDistribution] = await db.execute(`
            SELECT withdrawal_day, COUNT(*) as count, SUM(monthly_amount) as total_amount
            FROM auto_payment_info
            WHERE academy_id = ? AND is_active = TRUE
            GROUP BY withdrawal_day
            ORDER BY withdrawal_day
        `, [academyId]);

        // 월별 자동이체 수납 실적
        const [monthlyPerformance] = await db.execute(`
            SELECT COUNT(*) as payment_count, SUM(amount) as total_amount
            FROM payment_records
            WHERE academy_id = ?
            AND payment_method = 'auto_transfer'
            AND DATE_FORMAT(payment_date, '%Y-%m') = ?
            AND status = 'completed'
        `, [academyId, month]);

        return {
            summary: stats[0],
            by_day: dayDistribution,
            monthly_performance: monthlyPerformance[0]
        };
    }
}

module.exports = new AutoPaymentModel();