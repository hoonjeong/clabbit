const db = require('../config/database');

class ExamModel {
    /**
     * 시험 생성
     * @param {number} academyId 학원 ID
     * @param {Object} examData 시험 데이터
     * @returns {Promise<Object>} 생성된 시험
     */
    static async create(academyId, examData) {
        const {
            exam_name,
            exam_type,
            exam_date,
            total_score = 100,
            grade_level,
            subject,
            class_id,
            description,
            created_by
        } = examData;

        const query = `
            INSERT INTO exams (
                academy_id, exam_name, exam_type, exam_date, total_score,
                grade_level, subject, class_id, description, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            academyId,
            exam_name,
            exam_type,
            exam_date,
            total_score,
            grade_level || null,
            subject || null,
            class_id || null,
            description || null,
            created_by || null
        ]);

        return {
            id: result.insertId,
            academy_id: academyId,
            ...examData
        };
    }

    /**
     * 시험 목록 조회
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터 조건
     * @returns {Promise<Array>} 시험 목록
     */
    static async findAll(academyId, filters = {}) {
        let query = `
            SELECT e.*,
                   COUNT(DISTINCT ss.student_id) as student_count,
                   AVG(ss.raw_score) as avg_score,
                   c.name as class_name
            FROM exams e
            LEFT JOIN student_scores ss ON e.id = ss.exam_id
            LEFT JOIN classes c ON e.class_id = c.id
            WHERE e.academy_id = ? AND e.is_active = TRUE
        `;

        const params = [academyId];

        // 필터 적용
        if (filters.exam_type) {
            query += ' AND e.exam_type = ?';
            params.push(filters.exam_type);
        }

        if (filters.grade_level) {
            query += ' AND e.grade_level = ?';
            params.push(filters.grade_level);
        }

        if (filters.subject) {
            query += ' AND e.subject = ?';
            params.push(filters.subject);
        }

        if (filters.from_date) {
            query += ' AND e.exam_date >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND e.exam_date <= ?';
            params.push(filters.to_date);
        }

        query += ' GROUP BY e.id ORDER BY e.exam_date DESC, e.id DESC';

        // 페이지네이션
        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(filters.limit), parseInt(offset));
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 시험 상세 조회
     * @param {number} academyId 학원 ID
     * @param {number} examId 시험 ID
     * @returns {Promise<Object|null>} 시험 정보
     */
    static async findById(academyId, examId) {
        const query = `
            SELECT e.*,
                   COUNT(DISTINCT ss.student_id) as student_count,
                   AVG(ss.raw_score) as avg_score,
                   MAX(ss.raw_score) as max_score,
                   MIN(ss.raw_score) as min_score,
                   u.name as creator_name,
                   c.name as class_name
            FROM exams e
            LEFT JOIN student_scores ss ON e.id = ss.exam_id
            LEFT JOIN users u ON e.created_by = u.id
            LEFT JOIN classes c ON e.class_id = c.id
            WHERE e.academy_id = ? AND e.id = ? AND e.is_active = TRUE
            GROUP BY e.id
        `;

        const [rows] = await db.execute(query, [academyId, examId]);
        return rows[0] || null;
    }

    /**
     * 시험 수정
     * @param {number} academyId 학원 ID
     * @param {number} examId 시험 ID
     * @param {Object} updateData 수정할 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    static async update(academyId, examId, updateData) {
        const fields = [];
        const values = [];

        const updatableFields = [
            'exam_name', 'exam_type', 'exam_date', 'total_score',
            'grade_level', 'subject', 'class_id', 'description'
        ];

        updatableFields.forEach(field => {
            if (updateData[field] !== undefined) {
                fields.push(`${field} = ?`);
                values.push(updateData[field]);
            }
        });

        if (fields.length === 0) {
            return false;
        }

        const query = `
            UPDATE exams
            SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE academy_id = ? AND id = ?
        `;

        values.push(academyId, examId);

        const [result] = await db.execute(query, values);
        return result.affectedRows > 0;
    }

    /**
     * 시험 삭제 (소프트 삭제)
     * @param {number} academyId 학원 ID
     * @param {number} examId 시험 ID
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    static async delete(academyId, examId) {
        const query = `
            UPDATE exams
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [academyId, examId]);
        return result.affectedRows > 0;
    }

    /**
     * 시험 문항 추가
     * @param {number} examId 시험 ID
     * @param {Array} questions 문항 데이터 배열
     * @returns {Promise<number>} 추가된 문항 수
     */
    static async addQuestions(examId, questions) {
        if (!questions || questions.length === 0) {
            return 0;
        }

        const query = `
            INSERT INTO exam_questions (
                exam_id, question_number, question_type, correct_answer,
                score, difficulty, category
            ) VALUES ?
            ON DUPLICATE KEY UPDATE
                question_type = VALUES(question_type),
                correct_answer = VALUES(correct_answer),
                score = VALUES(score),
                difficulty = VALUES(difficulty),
                category = VALUES(category)
        `;

        const values = questions.map(q => [
            examId,
            q.question_number,
            q.question_type || null,
            q.correct_answer || null,
            q.score,
            q.difficulty || null,
            q.category || null
        ]);

        const [result] = await db.query(query, [values]);
        return result.affectedRows;
    }

    /**
     * 시험 문항 목록 조회
     * @param {number} examId 시험 ID
     * @returns {Promise<Array>} 문항 목록
     */
    static async getQuestions(examId) {
        const query = `
            SELECT * FROM exam_questions
            WHERE exam_id = ?
            ORDER BY question_number
        `;

        const [rows] = await db.execute(query, [examId]);
        return rows;
    }

    /**
     * 시험 통계 조회
     * @param {number} academyId 학원 ID
     * @param {number} examId 시험 ID
     * @returns {Promise<Object>} 시험 통계
     */
    static async getStatistics(academyId, examId) {
        const query = `
            SELECT
                COUNT(DISTINCT ss.student_id) as total_students,
                AVG(ss.raw_score) as avg_score,
                AVG(ss.percentage) as avg_percentage,
                MAX(ss.raw_score) as max_score,
                MIN(ss.raw_score) as min_score,
                STD(ss.raw_score) as std_deviation,
                COUNT(CASE WHEN ss.grade = '1' THEN 1 END) as grade_1_count,
                COUNT(CASE WHEN ss.grade = '2' THEN 1 END) as grade_2_count,
                COUNT(CASE WHEN ss.grade = '3' THEN 1 END) as grade_3_count,
                COUNT(CASE WHEN ss.grade = '4' THEN 1 END) as grade_4_count,
                COUNT(CASE WHEN ss.grade = '5' THEN 1 END) as grade_5_count,
                COUNT(CASE WHEN ss.grade = '6' THEN 1 END) as grade_6_count,
                COUNT(CASE WHEN ss.grade = '7' THEN 1 END) as grade_7_count,
                COUNT(CASE WHEN ss.grade = '8' THEN 1 END) as grade_8_count,
                COUNT(CASE WHEN ss.grade = '9' THEN 1 END) as grade_9_count
            FROM exams e
            LEFT JOIN student_scores ss ON e.id = ss.exam_id
            WHERE e.academy_id = ? AND e.id = ?
        `;

        const [rows] = await db.execute(query, [academyId, examId]);

        // 점수 분포 조회
        const distributionQuery = `
            SELECT
                FLOOR(raw_score / 10) * 10 as score_range,
                COUNT(*) as count
            FROM student_scores
            WHERE exam_id = ?
            GROUP BY score_range
            ORDER BY score_range
        `;

        const [distribution] = await db.execute(distributionQuery, [examId]);

        return {
            statistics: rows[0],
            distribution: distribution
        };
    }
}

module.exports = ExamModel;