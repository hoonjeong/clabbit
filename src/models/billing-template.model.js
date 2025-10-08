const db = require('../config/database');

class BillingTemplateModel {
    /**
     * 템플릿 생성
     * @param {number} academyId 학원 ID
     * @param {Object} data 템플릿 데이터
     * @returns {Promise<Object>} 생성된 템플릿
     */
    static async create(academyId, data) {
        const {
            name,
            description,
            items,
            total_amount
        } = data;

        const query = `
            INSERT INTO billing_templates (
                academy_id, name, description, items, total_amount, is_active
            ) VALUES (?, ?, ?, ?, ?, TRUE)
        `;

        const [result] = await db.execute(query, [
            academyId,
            name,
            description || null,
            JSON.stringify(items),
            total_amount || 0
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...data
        };
    }

    /**
     * 템플릿 목록 조회
     * @param {number} academyId 학원 ID
     * @param {boolean} activeOnly 활성 템플릿만 조회
     * @returns {Promise<Array>} 템플릿 목록
     */
    static async findAll(academyId, activeOnly = true) {
        let query = `
            SELECT * FROM billing_templates
            WHERE academy_id = ?
        `;

        if (activeOnly) {
            query += ' AND is_active = TRUE';
        }

        query += ' ORDER BY created_at DESC';

        const [rows] = await db.execute(query, [academyId]);

        // JSON 파싱
        return rows.map(row => ({
            ...row,
            items: typeof row.items === 'string' ? JSON.parse(row.items) : row.items
        }));
    }

    /**
     * 템플릿 상세 조회
     * @param {number} academyId 학원 ID
     * @param {number} templateId 템플릿 ID
     * @returns {Promise<Object|null>} 템플릿 정보
     */
    static async findById(academyId, templateId) {
        const query = `
            SELECT * FROM billing_templates
            WHERE academy_id = ? AND id = ?
        `;

        const [rows] = await db.execute(query, [academyId, templateId]);

        if (rows.length === 0) {
            return null;
        }

        const template = rows[0];
        return {
            ...template,
            items: typeof template.items === 'string' ? JSON.parse(template.items) : template.items
        };
    }

    /**
     * 템플릿 수정
     * @param {number} academyId 학원 ID
     * @param {number} templateId 템플릿 ID
     * @param {Object} data 수정할 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    static async update(academyId, templateId, data) {
        const fields = [];
        const values = [];

        const updatableFields = ['name', 'description', 'items', 'total_amount', 'is_active'];

        updatableFields.forEach(field => {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                if (field === 'items') {
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
            UPDATE billing_templates
            SET ${fields.join(', ')}
            WHERE academy_id = ? AND id = ?
        `;

        values.push(academyId, templateId);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * 템플릿 삭제 (소프트 삭제)
     * @param {number} academyId 학원 ID
     * @param {number} templateId 템플릿 ID
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    static async delete(academyId, templateId) {
        const query = `
            UPDATE billing_templates
            SET is_active = FALSE
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [academyId, templateId]);
        return result.affectedRows > 0;
    }

    /**
     * 템플릿을 이용한 청구 생성
     * @param {number} academyId 학원 ID
     * @param {number} templateId 템플릿 ID
     * @param {Array} studentIds 학생 ID 목록
     * @returns {Promise<Array>} 생성된 청구 목록
     */
    static async applyToStudents(academyId, templateId, studentIds) {
        const template = await this.findById(academyId, templateId);

        if (!template) {
            throw new Error('템플릿을 찾을 수 없습니다.');
        }

        const StudentChargeModel = require('./student-charge.model');
        const charges = [];

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            for (const studentId of studentIds) {
                for (const item of template.items) {
                    const chargeData = {
                        student_id: studentId,
                        billing_item_id: item.billing_item_id || null,
                        charge_date: new Date().toISOString().split('T')[0],
                        amount: item.amount,
                        discount_amount: item.discount_amount || 0,
                        discount_reason: item.discount_reason || null,
                        due_date: this.calculateDueDate(new Date()),
                        notes: `템플릿 적용: ${template.name}`
                    };

                    const charge = await StudentChargeModel.create(academyId, chargeData);
                    charges.push(charge);
                }
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
     * 납부 기한 계산
     */
    static calculateDueDate(chargeDate, daysToAdd = 7) {
        const dueDate = new Date(chargeDate);
        dueDate.setDate(dueDate.getDate() + daysToAdd);
        return dueDate.toISOString().split('T')[0];
    }

    /**
     * 템플릿 복사
     * @param {number} academyId 학원 ID
     * @param {number} templateId 템플릿 ID
     * @param {string} newName 새 템플릿 이름
     * @returns {Promise<Object>} 복사된 템플릿
     */
    static async duplicate(academyId, templateId, newName) {
        const original = await this.findById(academyId, templateId);

        if (!original) {
            throw new Error('원본 템플릿을 찾을 수 없습니다.');
        }

        const newTemplate = {
            name: newName || `${original.name} (복사본)`,
            description: original.description,
            items: original.items,
            total_amount: original.total_amount
        };

        return await this.create(academyId, newTemplate);
    }

    /**
     * 템플릿 사용 통계
     * @param {number} academyId 학원 ID
     * @param {number} templateId 템플릿 ID
     * @returns {Promise<Object>} 사용 통계
     */
    static async getUsageStatistics(academyId, templateId) {
        const template = await this.findById(academyId, templateId);

        if (!template) {
            return null;
        }

        // 템플릿을 사용한 청구 건수 조회
        const query = `
            SELECT
                COUNT(DISTINCT sc.id) as charge_count,
                COUNT(DISTINCT sc.student_id) as student_count,
                SUM(sc.final_amount) as total_amount,
                MAX(sc.charge_date) as last_used_date
            FROM student_charges sc
            WHERE sc.academy_id = ?
            AND sc.notes LIKE ?
        `;

        const [stats] = await db.execute(query, [
            academyId,
            `%템플릿 적용: ${template.name}%`
        ]);

        return {
            template_id: templateId,
            template_name: template.name,
            ...stats[0]
        };
    }
}

module.exports = BillingTemplateModel;