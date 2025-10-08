const db = require('../config/database');

class ConsultationModel {
    /**
     * 상담 분류 생성
     * @param {number} academyId 학원 ID
     * @param {Object} categoryData 분류 데이터
     * @returns {Promise<Object>} 생성된 분류
     */
    static async createCategory(academyId, categoryData) {
        const {
            category_name,
            category_type,
            description,
            color,
            display_order = 0
        } = categoryData;

        const query = `
            INSERT INTO consultation_categories (
                academy_id, category_name, category_type, description,
                color, display_order
            ) VALUES (?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            academyId,
            category_name,
            category_type,
            description || null,
            color || null,
            display_order
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...categoryData
        };
    }

    /**
     * 상담 분류 목록 조회
     * @param {number} academyId 학원 ID
     * @returns {Promise<Array>} 분류 목록
     */
    static async getCategories(academyId) {
        const query = `
            SELECT * FROM consultation_categories
            WHERE academy_id = ? AND is_active = TRUE
            ORDER BY display_order, id
        `;

        const [rows] = await db.execute(query, [academyId]);
        return rows;
    }

    /**
     * 상담 기록 생성
     * @param {number} academyId 학원 ID
     * @param {Object} consultationData 상담 데이터
     * @returns {Promise<Object>} 생성된 상담
     */
    static async create(academyId, consultationData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                student_id,
                category_id,
                consultation_date,
                consultation_time,
                consultant_id,
                consultation_method = '대면',
                consultation_purpose,
                consultation_content,
                consultation_result,
                parent_feedback,
                follow_up_required = false,
                follow_up_date,
                status = 'completed',
                is_important = false,
                attachments
            } = consultationData;

            const query = `
                INSERT INTO consultations (
                    academy_id, student_id, category_id, consultation_date,
                    consultation_time, consultant_id, consultation_method,
                    consultation_purpose, consultation_content, consultation_result,
                    parent_feedback, follow_up_required, follow_up_date,
                    status, is_important, attachments
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const [result] = await connection.execute(query, [
                academyId,
                student_id,
                category_id,
                consultation_date,
                consultation_time || null,
                consultant_id,
                consultation_method,
                consultation_purpose || null,
                consultation_content,
                consultation_result || null,
                parent_feedback || null,
                follow_up_required,
                follow_up_date || null,
                status,
                is_important,
                attachments ? JSON.stringify(attachments) : null
            ]);

            const consultationId = result.insertId;

            // 추가 상담이 필요한 경우 알림 생성 (추후 구현)
            if (follow_up_required && follow_up_date) {
                // TODO: 알림 생성 로직
            }

            await connection.commit();

            return {
                id: consultationId,
                academy_id: academyId,
                ...consultationData
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 상담 기록 목록 조회
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터 조건
     * @returns {Promise<Array>} 상담 목록
     */
    static async findAll(academyId, filters = {}) {
        let query = `
            SELECT c.*,
                   s.name as student_name,
                   s.grade as student_grade,
                   s.school,
                   s.phone as student_phone,
                   s.parent_phone,
                   cat.category_name,
                   cat.category_type,
                   cat.color as category_color,
                   u.name as consultant_name
            FROM consultations c
            JOIN students s ON c.student_id = s.id
            JOIN consultation_categories cat ON c.category_id = cat.id
            JOIN users u ON c.consultant_id = u.id
            WHERE c.academy_id = ?
        `;

        const params = [academyId];

        // 필터 적용
        if (filters.student_id) {
            query += ' AND c.student_id = ?';
            params.push(filters.student_id);
        }

        if (filters.consultant_id) {
            query += ' AND c.consultant_id = ?';
            params.push(filters.consultant_id);
        }

        if (filters.category_id) {
            query += ' AND c.category_id = ?';
            params.push(filters.category_id);
        }

        if (filters.status) {
            query += ' AND c.status = ?';
            params.push(filters.status);
        }

        if (filters.from_date) {
            query += ' AND c.consultation_date >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND c.consultation_date <= ?';
            params.push(filters.to_date);
        }

        if (filters.is_important !== undefined) {
            query += ' AND c.is_important = ?';
            params.push(filters.is_important);
        }

        if (filters.follow_up_required !== undefined) {
            query += ' AND c.follow_up_required = ?';
            params.push(filters.follow_up_required);
        }

        // 정렬
        query += ' ORDER BY c.consultation_date DESC, c.consultation_time DESC';

        // 페이지네이션
        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(filters.limit), parseInt(offset));
        }

        const [rows] = await db.execute(query, params);

        // JSON 필드 파싱
        rows.forEach(row => {
            if (row.attachments) {
                try {
                    row.attachments = JSON.parse(row.attachments);
                } catch (e) {
                    row.attachments = [];
                }
            }
        });

        return rows;
    }

    /**
     * 상담 기록 상세 조회
     * @param {number} academyId 학원 ID
     * @param {number} consultationId 상담 ID
     * @returns {Promise<Object|null>} 상담 정보
     */
    static async findById(academyId, consultationId) {
        const query = `
            SELECT c.*,
                   s.name as student_name,
                   s.grade as student_grade,
                   s.school,
                   s.phone as student_phone,
                   s.parent_phone,
                   cat.category_name,
                   cat.category_type,
                   cat.color as category_color,
                   u.name as consultant_name
            FROM consultations c
            JOIN students s ON c.student_id = s.id
            JOIN consultation_categories cat ON c.category_id = cat.id
            JOIN users u ON c.consultant_id = u.id
            WHERE c.academy_id = ? AND c.id = ?
        `;

        const [rows] = await db.execute(query, [academyId, consultationId]);

        if (rows.length === 0) {
            return null;
        }

        const consultation = rows[0];

        // JSON 필드 파싱
        if (consultation.attachments) {
            try {
                consultation.attachments = JSON.parse(consultation.attachments);
            } catch (e) {
                consultation.attachments = [];
            }
        }

        // 관련 상담 이력 조회
        const historyQuery = `
            SELECT c.id, c.consultation_date, c.consultation_time,
                   cat.category_name, u.name as consultant_name
            FROM consultations c
            JOIN consultation_categories cat ON c.category_id = cat.id
            JOIN users u ON c.consultant_id = u.id
            WHERE c.academy_id = ? AND c.student_id = ? AND c.id != ?
            ORDER BY c.consultation_date DESC
            LIMIT 5
        `;

        const [history] = await db.execute(historyQuery, [
            academyId,
            consultation.student_id,
            consultationId
        ]);

        consultation.related_history = history;

        return consultation;
    }

    /**
     * 학생별 상담 이력 조회
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @returns {Promise<Array>} 상담 이력
     */
    static async findByStudent(academyId, studentId) {
        const query = `
            SELECT c.*,
                   cat.category_name,
                   cat.category_type,
                   cat.color as category_color,
                   u.name as consultant_name
            FROM consultations c
            JOIN consultation_categories cat ON c.category_id = cat.id
            JOIN users u ON c.consultant_id = u.id
            WHERE c.academy_id = ? AND c.student_id = ?
            ORDER BY c.consultation_date DESC, c.consultation_time DESC
        `;

        const [rows] = await db.execute(query, [academyId, studentId]);

        rows.forEach(row => {
            if (row.attachments) {
                try {
                    row.attachments = JSON.parse(row.attachments);
                } catch (e) {
                    row.attachments = [];
                }
            }
        });

        return rows;
    }

    /**
     * 상담 기록 수정
     * @param {number} academyId 학원 ID
     * @param {number} consultationId 상담 ID
     * @param {Object} updateData 수정할 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    static async update(academyId, consultationId, updateData) {
        const fields = [];
        const values = [];

        const updatableFields = [
            'category_id', 'consultation_date', 'consultation_time',
            'consultation_method', 'consultation_purpose', 'consultation_content',
            'consultation_result', 'parent_feedback', 'follow_up_required',
            'follow_up_date', 'status', 'is_important'
        ];

        updatableFields.forEach(field => {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        });

        if (updateData.attachments !== undefined) {
            fields.push('attachments = ?');
            values.push(JSON.stringify(updateData.attachments));
        }

        if (fields.length === 0) {
            return false;
        }

        const query = `
            UPDATE consultations
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE academy_id = ? AND id = ?
        `;

        values.push(academyId, consultationId);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * 상담 기록 삭제
     * @param {number} academyId 학원 ID
     * @param {number} consultationId 상담 ID
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    static async delete(academyId, consultationId) {
        const query = `
            DELETE FROM consultations
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [academyId, consultationId]);
        return result.affectedRows > 0;
    }

    /**
     * 중요 표시 토글
     * @param {number} academyId 학원 ID
     * @param {number} consultationId 상담 ID
     * @returns {Promise<boolean>} 변경 성공 여부
     */
    static async toggleImportant(academyId, consultationId) {
        const query = `
            UPDATE consultations
            SET is_important = NOT is_important
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [academyId, consultationId]);
        return result.affectedRows > 0;
    }

    /**
     * 미상담자 목록 조회
     * @param {number} academyId 학원 ID
     * @param {number} days 기준 일수 (기본 30일)
     * @returns {Promise<Array>} 미상담자 목록
     */
    static async getPendingStudents(academyId, days = 30) {
        const query = `
            SELECT
                s.id as student_id,
                s.name as student_name,
                s.grade,
                s.school,
                s.phone as student_phone,
                s.parent_phone,
                MAX(c.consultation_date) as last_consultation_date,
                DATEDIFF(CURDATE(), MAX(c.consultation_date)) as days_since_last
            FROM students s
            LEFT JOIN consultations c ON s.id = c.student_id AND c.status = 'completed'
            WHERE s.academy_id = ? AND s.status = 'active'
            GROUP BY s.id
            HAVING last_consultation_date IS NULL OR DATEDIFF(CURDATE(), last_consultation_date) > ?
            ORDER BY days_since_last DESC
        `;

        const [rows] = await db.execute(query, [academyId, days]);
        return rows;
    }

    /**
     * 상담 통계 조회
     * @param {number} academyId 학원 ID
     * @param {Object} options 옵션
     * @returns {Promise<Object>} 통계 데이터
     */
    static async getStatistics(academyId, options = {}) {
        const { from_date, to_date, consultant_id } = options;

        let baseQuery = 'WHERE c.academy_id = ?';
        const params = [academyId];

        if (from_date) {
            baseQuery += ' AND c.consultation_date >= ?';
            params.push(from_date);
        }

        if (to_date) {
            baseQuery += ' AND c.consultation_date <= ?';
            params.push(to_date);
        }

        if (consultant_id) {
            baseQuery += ' AND c.consultant_id = ?';
            params.push(consultant_id);
        }

        // 전체 통계
        const totalQuery = `
            SELECT
                COUNT(*) as total_consultations,
                COUNT(DISTINCT c.student_id) as total_students,
                COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN c.status = 'scheduled' THEN 1 END) as scheduled_count,
                COUNT(CASE WHEN c.status = 'cancelled' THEN 1 END) as cancelled_count,
                COUNT(CASE WHEN c.follow_up_required = TRUE THEN 1 END) as follow_up_count,
                COUNT(CASE WHEN c.is_important = TRUE THEN 1 END) as important_count
            FROM consultations c
            ${baseQuery}
        `;

        const [totalStats] = await db.execute(totalQuery, params);

        // 카테고리별 통계
        const categoryQuery = `
            SELECT
                cat.category_name,
                cat.category_type,
                cat.color,
                COUNT(c.id) as count
            FROM consultation_categories cat
            LEFT JOIN consultations c ON cat.id = c.category_id AND ${baseQuery.replace('WHERE ', '')}
            WHERE cat.academy_id = ?
            GROUP BY cat.id
            ORDER BY count DESC
        `;

        const [categoryStats] = await db.execute(categoryQuery, [...params.slice(1), academyId]);

        // 교사별 통계
        const consultantQuery = `
            SELECT
                u.name as consultant_name,
                COUNT(c.id) as consultation_count,
                COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as completed_count
            FROM users u
            JOIN consultations c ON u.id = c.consultant_id
            ${baseQuery}
            GROUP BY u.id
            ORDER BY consultation_count DESC
        `;

        const [consultantStats] = await db.execute(consultantQuery, params);

        // 월별 추이
        const monthlyQuery = `
            SELECT
                DATE_FORMAT(c.consultation_date, '%Y-%m') as month,
                COUNT(*) as count
            FROM consultations c
            ${baseQuery}
            GROUP BY month
            ORDER BY month DESC
            LIMIT 12
        `;

        const [monthlyStats] = await db.execute(monthlyQuery, params);

        return {
            total: totalStats[0],
            by_category: categoryStats,
            by_consultant: consultantStats,
            by_month: monthlyStats
        };
    }
}

module.exports = ConsultationModel;