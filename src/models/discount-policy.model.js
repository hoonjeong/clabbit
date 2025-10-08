const db = require('../config/database');

class DiscountPolicyModel {
    /**
     * 할인 정책 생성
     * @param {number} academyId 학원 ID
     * @param {Object} data 할인 정책 데이터
     * @returns {Promise<Object>} 생성된 할인 정책
     */
    static async create(academyId, data) {
        const {
            name,
            type = 'fixed',
            value,
            conditions,
            priority = 0,
            valid_from,
            valid_to
        } = data;

        const query = `
            INSERT INTO discount_policies (
                academy_id, name, type, value, conditions,
                priority, is_active, valid_from, valid_to
            ) VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?)
        `;

        const [result] = await db.execute(query, [
            academyId,
            name,
            type,
            value,
            JSON.stringify(conditions || {}),
            priority,
            valid_from || null,
            valid_to || null
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...data
        };
    }

    /**
     * 할인 정책 목록 조회
     * @param {number} academyId 학원 ID
     * @param {boolean} activeOnly 활성 정책만 조회
     * @returns {Promise<Array>} 할인 정책 목록
     */
    static async findAll(academyId, activeOnly = true) {
        let query = `
            SELECT * FROM discount_policies
            WHERE academy_id = ?
        `;

        if (activeOnly) {
            query += ` AND is_active = TRUE
                      AND (valid_from IS NULL OR valid_from <= CURDATE())
                      AND (valid_to IS NULL OR valid_to >= CURDATE())`;
        }

        query += ' ORDER BY priority DESC, created_at DESC';

        const [rows] = await db.execute(query, [academyId]);

        return rows.map(row => ({
            ...row,
            conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions
        }));
    }

    /**
     * 할인 정책 상세 조회
     * @param {number} academyId 학원 ID
     * @param {number} policyId 정책 ID
     * @returns {Promise<Object|null>} 할인 정책
     */
    static async findById(academyId, policyId) {
        const query = `
            SELECT * FROM discount_policies
            WHERE academy_id = ? AND id = ?
        `;

        const [rows] = await db.execute(query, [academyId, policyId]);

        if (rows.length === 0) {
            return null;
        }

        const policy = rows[0];
        return {
            ...policy,
            conditions: typeof policy.conditions === 'string' ? JSON.parse(policy.conditions) : policy.conditions
        };
    }

    /**
     * 학생에게 적용 가능한 할인 정책 조회
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {Object} context 적용 컨텍스트
     * @returns {Promise<Array>} 적용 가능한 할인 정책 목록
     */
    static async findApplicableForStudent(academyId, studentId, context = {}) {
        // 활성 할인 정책 조회
        const policies = await this.findAll(academyId, true);

        // 학생 정보 조회
        const [studentResult] = await db.execute(
            'SELECT * FROM students WHERE id = ? AND academy_id = ?',
            [studentId, academyId]
        );

        if (!studentResult[0]) {
            return [];
        }

        const student = studentResult[0];

        // 형제 확인
        const [siblingResult] = await db.execute(
            'SELECT COUNT(*) as sibling_count FROM students WHERE academy_id = ? AND parent_phone = ? AND status = "active" AND id != ?',
            [academyId, student.parent_phone, studentId]
        );
        const hasSibling = siblingResult[0].sibling_count > 0;

        // 수강 기간 확인
        const [enrollmentResult] = await db.execute(
            'SELECT MIN(created_at) as first_enrollment FROM students WHERE id = ? AND academy_id = ?',
            [studentId, academyId]
        );
        const monthsEnrolled = this.getMonthsDifference(
            new Date(enrollmentResult[0].first_enrollment),
            new Date()
        );

        // 적용 가능한 정책 필터링
        const applicablePolicies = [];

        for (const policy of policies) {
            if (this.isPolicyApplicable(policy, {
                ...context,
                student,
                hasSibling,
                monthsEnrolled
            })) {
                applicablePolicies.push(policy);
            }
        }

        return applicablePolicies;
    }

    /**
     * 정책 적용 가능 여부 확인
     */
    static isPolicyApplicable(policy, context) {
        const conditions = policy.conditions || {};

        // 형제 할인
        if (conditions.sibling_discount && !context.hasSibling) {
            return false;
        }

        // 장기 등록 할인
        if (conditions.long_term_months && context.monthsEnrolled < conditions.long_term_months) {
            return false;
        }

        // 특정 학년 할인
        if (conditions.grades && conditions.grades.length > 0) {
            if (!conditions.grades.includes(context.student.grade)) {
                return false;
            }
        }

        // 특정 청구 항목 할인
        if (conditions.billing_items && conditions.billing_items.length > 0) {
            if (!context.billing_item_id || !conditions.billing_items.includes(context.billing_item_id)) {
                return false;
            }
        }

        // 최소 금액 조건
        if (conditions.min_amount && context.amount < conditions.min_amount) {
            return false;
        }

        return true;
    }

    /**
     * 할인 금액 계산
     * @param {Object} policy 할인 정책
     * @param {number} amount 원금액
     * @returns {number} 할인 금액
     */
    static calculateDiscountAmount(policy, amount) {
        if (policy.type === 'percentage') {
            return Math.floor(amount * (policy.value / 100));
        } else {
            return Math.min(policy.value, amount);
        }
    }

    /**
     * 최적 할인 정책 선택
     * @param {Array} policies 적용 가능한 정책 목록
     * @param {number} amount 원금액
     * @returns {Object|null} 최적 할인 정책
     */
    static selectBestPolicy(policies, amount) {
        if (policies.length === 0) {
            return null;
        }

        let bestPolicy = null;
        let maxDiscount = 0;

        for (const policy of policies) {
            const discountAmount = this.calculateDiscountAmount(policy, amount);
            if (discountAmount > maxDiscount) {
                maxDiscount = discountAmount;
                bestPolicy = policy;
            }
        }

        return bestPolicy;
    }

    /**
     * 할인 정책 수정
     * @param {number} academyId 학원 ID
     * @param {number} policyId 정책 ID
     * @param {Object} data 수정할 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    static async update(academyId, policyId, data) {
        const fields = [];
        const values = [];

        const updatableFields = [
            'name', 'type', 'value', 'conditions',
            'priority', 'is_active', 'valid_from', 'valid_to'
        ];

        updatableFields.forEach(field => {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (field === 'conditions') {
                    values.push(JSON.stringify(data[field]));
                } else {
                    values.push(data[field]);
                }
            }
        });

        if (fields.length === 0) {
            return false;
        }

        const query = `
            UPDATE discount_policies
            SET ${fields.join(', ')}
            WHERE academy_id = ? AND id = ?
        `;

        values.push(academyId, policyId);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * 할인 정책 삭제 (소프트 삭제)
     * @param {number} academyId 학원 ID
     * @param {number} policyId 정책 ID
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    static async delete(academyId, policyId) {
        const query = `
            UPDATE discount_policies
            SET is_active = FALSE
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [academyId, policyId]);
        return result.affectedRows > 0;
    }

    /**
     * 할인 적용 통계
     * @param {number} academyId 학원 ID
     * @param {string} month YYYY-MM 형식
     * @returns {Promise<Object>} 할인 통계
     */
    static async getDiscountStatistics(academyId, month) {
        const query = `
            SELECT
                COUNT(DISTINCT student_id) as students_with_discount,
                COUNT(*) as total_discounts,
                SUM(discount_amount) as total_discount_amount,
                AVG(discount_amount) as average_discount,
                MAX(discount_amount) as max_discount,
                discount_reason,
                COUNT(*) as reason_count
            FROM student_charges
            WHERE academy_id = ?
            AND DATE_FORMAT(charge_date, '%Y-%m') = ?
            AND discount_amount > 0
            GROUP BY discount_reason
            ORDER BY reason_count DESC
        `;

        const [rows] = await db.execute(query, [academyId, month]);

        const totalStats = await db.execute(`
            SELECT
                SUM(discount_amount) as total_discount,
                SUM(amount) as total_original,
                SUM(final_amount) as total_final
            FROM student_charges
            WHERE academy_id = ?
            AND DATE_FORMAT(charge_date, '%Y-%m') = ?
        `, [academyId, month]);

        return {
            by_reason: rows,
            summary: totalStats[0][0],
            discount_rate: totalStats[0][0].total_original > 0
                ? ((totalStats[0][0].total_discount / totalStats[0][0].total_original) * 100).toFixed(2)
                : 0
        };
    }

    /**
     * 월 차이 계산
     */
    static getMonthsDifference(startDate, endDate) {
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
        return months + endDate.getMonth() - startDate.getMonth();
    }
}

module.exports = DiscountPolicyModel;