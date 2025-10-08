const db = require('../config/database');

class BillingItemModel {
    /**
     * 청구 항목 생성
     * @param {number} academyId 학원 ID
     * @param {Object} data 청구 항목 데이터
     * @returns {Promise<Object>} 생성된 청구 항목
     */
    static async create(academyId, data) {
        const {
            name,
            category = 'tuition',
            default_amount = 0,
            description,
            is_recurring = false,
            recurring_day
        } = data;

        const query = `
            INSERT INTO billing_items (
                academy_id, name, category, default_amount, description,
                is_recurring, recurring_day, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
        `;

        const [result] = await db.execute(query, [
            academyId,
            name,
            category,
            default_amount,
            description || null,
            is_recurring,
            recurring_day || null
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...data
        };
    }

    /**
     * 학원의 모든 청구 항목 조회
     * @param {number} academyId 학원 ID
     * @param {boolean} activeOnly 활성 항목만 조회
     * @returns {Promise<Array>} 청구 항목 목록
     */
    static async findAll(academyId, activeOnly = true) {
        let query = `
            SELECT * FROM billing_items
            WHERE academy_id = ?
        `;

        if (activeOnly) {
            query += ' AND is_active = TRUE';
        }

        query += ' ORDER BY category, name';

        const [rows] = await db.execute(query, [academyId]);
        return rows;
    }

    /**
     * 카테고리별 청구 항목 조회
     * @param {number} academyId 학원 ID
     * @param {string} category 카테고리
     * @returns {Promise<Array>} 청구 항목 목록
     */
    static async findByCategory(academyId, category) {
        const query = `
            SELECT * FROM billing_items
            WHERE academy_id = ? AND category = ? AND is_active = TRUE
            ORDER BY name
        `;

        const [rows] = await db.execute(query, [academyId, category]);
        return rows;
    }

    /**
     * 정기 청구 항목 조회
     * @param {number} academyId 학원 ID
     * @param {number} day 청구일
     * @returns {Promise<Array>} 정기 청구 항목 목록
     */
    static async findRecurring(academyId, day = null) {
        let query = `
            SELECT * FROM billing_items
            WHERE academy_id = ? AND is_recurring = TRUE AND is_active = TRUE
        `;

        const params = [academyId];

        if (day !== null) {
            query += ' AND recurring_day = ?';
            params.push(day);
        }

        query += ' ORDER BY recurring_day, name';

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 청구 항목 조회
     * @param {number} academyId 학원 ID
     * @param {number} itemId 항목 ID
     * @returns {Promise<Object|null>} 청구 항목
     */
    static async findById(academyId, itemId) {
        const query = `
            SELECT * FROM billing_items
            WHERE academy_id = ? AND id = ?
        `;

        const [rows] = await db.execute(query, [academyId, itemId]);
        return rows[0] || null;
    }

    /**
     * 청구 항목 수정
     * @param {number} academyId 학원 ID
     * @param {number} itemId 항목 ID
     * @param {Object} data 수정할 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    static async update(academyId, itemId, data) {
        const fields = [];
        const values = [];

        // 수정 가능한 필드들
        const updatableFields = [
            'name', 'category', 'default_amount', 'description',
            'is_recurring', 'recurring_day', 'is_active'
        ];

        updatableFields.forEach(field => {
            if (data[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(data[field]);
            }
        });

        if (fields.length === 0) {
            return false;
        }

        const query = `
            UPDATE billing_items
            SET ${fields.join(', ')}
            WHERE academy_id = ? AND id = ?
        `;

        values.push(academyId, itemId);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * 청구 항목 삭제 (소프트 삭제)
     * @param {number} academyId 학원 ID
     * @param {number} itemId 항목 ID
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    static async delete(academyId, itemId) {
        const query = `
            UPDATE billing_items
            SET is_active = FALSE
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [academyId, itemId]);
        return result.affectedRows > 0;
    }

    /**
     * 청구 항목 통계
     * @param {number} academyId 학원 ID
     * @returns {Promise<Object>} 통계 정보
     */
    static async getStatistics(academyId) {
        const query = `
            SELECT
                COUNT(*) as total_items,
                COUNT(CASE WHEN is_active = TRUE THEN 1 END) as active_items,
                COUNT(CASE WHEN is_recurring = TRUE AND is_active = TRUE THEN 1 END) as recurring_items,
                COUNT(CASE WHEN category = 'tuition' AND is_active = TRUE THEN 1 END) as tuition_items,
                COUNT(CASE WHEN category = 'material' AND is_active = TRUE THEN 1 END) as material_items,
                COUNT(CASE WHEN category = 'test' AND is_active = TRUE THEN 1 END) as test_items,
                COUNT(CASE WHEN category = 'event' AND is_active = TRUE THEN 1 END) as event_items,
                COUNT(CASE WHEN category = 'other' AND is_active = TRUE THEN 1 END) as other_items
            FROM billing_items
            WHERE academy_id = ?
        `;

        const [rows] = await db.execute(query, [academyId]);
        return rows[0];
    }
}

module.exports = BillingItemModel;