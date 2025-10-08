const db = require('../config/database');

class StudentScoreModel {
    /**
     * 성적 입력
     * @param {number} academyId 학원 ID
     * @param {Object} scoreData 성적 데이터
     * @returns {Promise<Object>} 생성된 성적
     */
    static async create(academyId, scoreData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const {
                student_id,
                exam_id,
                raw_score,
                graded_by,
                notes,
                answers = []
            } = scoreData;

            // 성적 입력
            const scoreQuery = `
                INSERT INTO student_scores (
                    academy_id, student_id, exam_id, raw_score,
                    submitted_at, graded_at, graded_by, notes
                ) VALUES (?, ?, ?, ?, NOW(), NOW(), ?, ?)
                ON DUPLICATE KEY UPDATE
                    raw_score = VALUES(raw_score),
                    graded_at = NOW(),
                    graded_by = VALUES(graded_by),
                    notes = VALUES(notes)
            `;

            const [scoreResult] = await connection.execute(scoreQuery, [
                academyId,
                student_id,
                exam_id,
                raw_score,
                graded_by || null,
                notes || null
            ]);

            const scoreId = scoreResult.insertId || scoreResult.affectedRows;

            // 답안 입력 (있는 경우)
            if (answers.length > 0) {
                const answerQuery = `
                    INSERT INTO student_answers (
                        score_id, question_id, student_answer, is_correct, score_earned
                    ) VALUES ?
                    ON DUPLICATE KEY UPDATE
                        student_answer = VALUES(student_answer),
                        is_correct = VALUES(is_correct),
                        score_earned = VALUES(score_earned)
                `;

                const answerValues = answers.map(a => [
                    scoreId,
                    a.question_id,
                    a.student_answer || null,
                    a.is_correct || false,
                    a.score_earned || 0
                ]);

                await connection.query(answerQuery, [answerValues]);
            }

            // 등급 및 석차 계산
            await this.calculateGradeAndRank(connection, academyId, exam_id, student_id);

            await connection.commit();

            return {
                id: scoreId,
                academy_id: academyId,
                ...scoreData
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 성적 일괄 입력
     * @param {number} academyId 학원 ID
     * @param {number} examId 시험 ID
     * @param {Array} scores 성적 데이터 배열
     * @returns {Promise<Object>} 입력 결과
     */
    static async bulkCreate(academyId, examId, scores) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const query = `
                INSERT INTO student_scores (
                    academy_id, student_id, exam_id, raw_score,
                    submitted_at, graded_at, graded_by
                ) VALUES ?
                ON DUPLICATE KEY UPDATE
                    raw_score = VALUES(raw_score),
                    graded_at = NOW()
            `;

            const values = scores.map(s => [
                academyId,
                s.student_id,
                examId,
                s.raw_score,
                new Date(),
                new Date(),
                s.graded_by || null
            ]);

            const [result] = await connection.query(query, [values]);

            // 모든 학생의 등급 및 석차 재계산
            for (const score of scores) {
                await this.calculateGradeAndRank(connection, academyId, examId, score.student_id);
            }

            await connection.commit();

            return {
                success: true,
                count: result.affectedRows,
                message: `${result.affectedRows}개의 성적이 입력되었습니다.`
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 등급 및 석차 계산
     * @param {Object} connection DB 연결
     * @param {number} academyId 학원 ID
     * @param {number} examId 시험 ID
     * @param {number} studentId 학생 ID
     */
    static async calculateGradeAndRank(connection, academyId, examId, studentId) {
        // 해당 시험의 모든 성적 조회
        const [scores] = await connection.execute(`
            SELECT ss.id, ss.student_id, ss.raw_score, ss.percentage,
                   s.grade as student_grade, s.class_id
            FROM student_scores ss
            JOIN students s ON ss.student_id = s.id
            WHERE ss.academy_id = ? AND ss.exam_id = ?
            ORDER BY ss.raw_score DESC
        `, [academyId, examId]);

        // 현재 학생의 정보
        const studentScore = scores.find(s => s.student_id === studentId);
        if (!studentScore) return;

        // 등급 계산 (9등급제)
        const grade = this.calculateGrade(studentScore.percentage);

        // 전체 석차 계산
        const rankInGrade = scores.findIndex(s => s.student_id === studentId) + 1;

        // 반별 석차 계산
        const classScores = scores.filter(s => s.class_id === studentScore.class_id);
        const rankInClass = classScores.findIndex(s => s.student_id === studentId) + 1;

        // 업데이트
        await connection.execute(`
            UPDATE student_scores
            SET grade = ?,
                rank_in_class = ?,
                rank_in_grade = ?,
                total_students_class = ?,
                total_students_grade = ?
            WHERE id = ?
        `, [
            grade,
            rankInClass,
            rankInGrade,
            classScores.length,
            scores.length,
            studentScore.id
        ]);
    }

    /**
     * 등급 계산 (9등급제)
     * @param {number} percentage 백분율
     * @returns {string} 등급
     */
    static calculateGrade(percentage) {
        if (percentage >= 96) return '1';
        if (percentage >= 89) return '2';
        if (percentage >= 77) return '3';
        if (percentage >= 60) return '4';
        if (percentage >= 40) return '5';
        if (percentage >= 23) return '6';
        if (percentage >= 11) return '7';
        if (percentage >= 4) return '8';
        return '9';
    }

    /**
     * 성적 조회
     * @param {number} academyId 학원 ID
     * @param {Object} filters 필터 조건
     * @returns {Promise<Array>} 성적 목록
     */
    static async findAll(academyId, filters = {}) {
        let query = `
            SELECT ss.*,
                   s.name as student_name,
                   s.grade as student_grade,
                   s.school,
                   e.exam_name,
                   e.exam_date,
                   e.exam_type,
                   e.total_score,
                   e.subject,
                   u.name as grader_name
            FROM student_scores ss
            JOIN students s ON ss.student_id = s.id
            JOIN exams e ON ss.exam_id = e.id
            LEFT JOIN users u ON ss.graded_by = u.id
            WHERE ss.academy_id = ?
        `;

        const params = [academyId];

        if (filters.exam_id) {
            query += ' AND ss.exam_id = ?';
            params.push(filters.exam_id);
        }

        if (filters.student_id) {
            query += ' AND ss.student_id = ?';
            params.push(filters.student_id);
        }

        if (filters.from_date) {
            query += ' AND e.exam_date >= ?';
            params.push(filters.from_date);
        }

        if (filters.to_date) {
            query += ' AND e.exam_date <= ?';
            params.push(filters.to_date);
        }

        query += ' ORDER BY e.exam_date DESC, ss.rank_in_grade';

        if (filters.limit) {
            const offset = filters.offset || 0;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(filters.limit), parseInt(offset));
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 성적 상세 조회
     * @param {number} academyId 학원 ID
     * @param {number} scoreId 성적 ID
     * @returns {Promise<Object|null>} 성적 정보
     */
    static async findById(academyId, scoreId) {
        const query = `
            SELECT ss.*,
                   s.name as student_name,
                   s.grade as student_grade,
                   s.school,
                   s.phone as student_phone,
                   s.parent_phone,
                   e.exam_name,
                   e.exam_date,
                   e.exam_type,
                   e.total_score,
                   e.subject,
                   u.name as grader_name
            FROM student_scores ss
            JOIN students s ON ss.student_id = s.id
            JOIN exams e ON ss.exam_id = e.id
            LEFT JOIN users u ON ss.graded_by = u.id
            WHERE ss.academy_id = ? AND ss.id = ?
        `;

        const [rows] = await db.execute(query, [academyId, scoreId]);

        if (rows.length === 0) {
            return null;
        }

        const score = rows[0];

        // 답안 조회
        const answerQuery = `
            SELECT sa.*, eq.question_number, eq.correct_answer, eq.score as max_score,
                   eq.category, eq.difficulty
            FROM student_answers sa
            JOIN exam_questions eq ON sa.question_id = eq.id
            WHERE sa.score_id = ?
            ORDER BY eq.question_number
        `;

        const [answers] = await db.execute(answerQuery, [scoreId]);
        score.answers = answers;

        // 영역별 분석 조회
        const analysisQuery = `
            SELECT * FROM score_analysis
            WHERE score_id = ?
        `;

        const [analysis] = await db.execute(analysisQuery, [scoreId]);
        score.analysis = analysis;

        return score;
    }

    /**
     * 학생별 성적 이력 조회
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {Object} options 옵션
     * @returns {Promise<Array>} 성적 이력
     */
    static async findByStudent(academyId, studentId, options = {}) {
        let query = `
            SELECT ss.*,
                   e.exam_name,
                   e.exam_date,
                   e.exam_type,
                   e.total_score,
                   e.subject
            FROM student_scores ss
            JOIN exams e ON ss.exam_id = e.id
            WHERE ss.academy_id = ? AND ss.student_id = ?
        `;

        const params = [academyId, studentId];

        if (options.subject) {
            query += ' AND e.subject = ?';
            params.push(options.subject);
        }

        if (options.exam_type) {
            query += ' AND e.exam_type = ?';
            params.push(options.exam_type);
        }

        if (options.from_date) {
            query += ' AND e.exam_date >= ?';
            params.push(options.from_date);
        }

        query += ' ORDER BY e.exam_date DESC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(parseInt(options.limit));
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 성적 추이 분석
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {string} subject 과목 (선택)
     * @param {number} months 조회 기간 (개월)
     * @returns {Promise<Object>} 성적 추이 데이터
     */
    static async analyzeTrend(academyId, studentId, subject = null, months = 6) {
        let query = `
            SELECT
                e.exam_date,
                e.exam_name,
                e.subject,
                ss.raw_score,
                ss.percentage,
                ss.grade,
                ss.rank_in_grade,
                ss.total_students_grade
            FROM student_scores ss
            JOIN exams e ON ss.exam_id = e.id
            WHERE ss.academy_id = ? AND ss.student_id = ?
                AND e.exam_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
        `;

        const params = [academyId, studentId, months];

        if (subject) {
            query += ' AND e.subject = ?';
            params.push(subject);
        }

        query += ' ORDER BY e.exam_date';

        const [rows] = await db.execute(query, params);

        // 통계 계산
        const stats = {
            total_exams: rows.length,
            avg_score: 0,
            avg_percentage: 0,
            best_score: null,
            worst_score: null,
            improvement_rate: 0
        };

        if (rows.length > 0) {
            const scores = rows.map(r => r.raw_score);
            const percentages = rows.map(r => r.percentage);

            stats.avg_score = scores.reduce((a, b) => a + b, 0) / scores.length;
            stats.avg_percentage = percentages.reduce((a, b) => a + b, 0) / percentages.length;
            stats.best_score = Math.max(...scores);
            stats.worst_score = Math.min(...scores);

            // 향상도 계산 (첫 시험 대비 마지막 시험)
            if (rows.length >= 2) {
                const firstScore = rows[0].percentage;
                const lastScore = rows[rows.length - 1].percentage;
                stats.improvement_rate = lastScore - firstScore;
            }
        }

        return {
            trend: rows,
            statistics: stats
        };
    }

    /**
     * 영역별 분석 생성
     * @param {number} scoreId 성적 ID
     * @returns {Promise<void>}
     */
    static async createAnalysis(scoreId) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // 문항별 답안과 영역 정보 조회
            const [answers] = await connection.execute(`
                SELECT eq.category, sa.is_correct, eq.difficulty
                FROM student_answers sa
                JOIN exam_questions eq ON sa.question_id = eq.id
                WHERE sa.score_id = ?
            `, [scoreId]);

            // 영역별 집계
            const categoryStats = {};

            answers.forEach(answer => {
                if (!answer.category) return;

                if (!categoryStats[answer.category]) {
                    categoryStats[answer.category] = {
                        total: 0,
                        correct: 0,
                        difficulty_sum: 0
                    };
                }

                categoryStats[answer.category].total++;
                if (answer.is_correct) {
                    categoryStats[answer.category].correct++;
                }

                const difficultyValue = answer.difficulty === '상' ? 3 :
                                      answer.difficulty === '중' ? 2 : 1;
                categoryStats[answer.category].difficulty_sum += difficultyValue;
            });

            // 분석 데이터 저장
            for (const [category, stats] of Object.entries(categoryStats)) {
                const accuracy_rate = (stats.correct / stats.total) * 100;
                const avg_difficulty = stats.difficulty_sum / stats.total;

                await connection.execute(`
                    INSERT INTO score_analysis (
                        score_id, category, total_questions, correct_answers,
                        accuracy_rate, avg_difficulty
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        total_questions = VALUES(total_questions),
                        correct_answers = VALUES(correct_answers),
                        accuracy_rate = VALUES(accuracy_rate),
                        avg_difficulty = VALUES(avg_difficulty)
                `, [scoreId, category, stats.total, stats.correct, accuracy_rate, avg_difficulty]);
            }

            await connection.commit();
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 성적 수정
     * @param {number} academyId 학원 ID
     * @param {number} scoreId 성적 ID
     * @param {Object} updateData 수정할 데이터
     * @returns {Promise<boolean>} 수정 성공 여부
     */
    static async update(academyId, scoreId, updateData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            const { raw_score, notes, graded_by } = updateData;

            const query = `
                UPDATE student_scores
                SET raw_score = ?, notes = ?, graded_by = ?, graded_at = NOW()
                WHERE academy_id = ? AND id = ?
            `;

            const [result] = await connection.execute(query, [
                raw_score,
                notes || null,
                graded_by || null,
                academyId,
                scoreId
            ]);

            if (result.affectedRows > 0) {
                // 해당 성적의 시험 정보 조회
                const [scoreInfo] = await connection.execute(
                    'SELECT exam_id, student_id FROM student_scores WHERE id = ?',
                    [scoreId]
                );

                if (scoreInfo.length > 0) {
                    // 등급 및 석차 재계산
                    await this.calculateGradeAndRank(
                        connection,
                        academyId,
                        scoreInfo[0].exam_id,
                        scoreInfo[0].student_id
                    );
                }
            }

            await connection.commit();
            return result.affectedRows > 0;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 성적 삭제
     * @param {number} academyId 학원 ID
     * @param {number} scoreId 성적 ID
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    static async delete(academyId, scoreId) {
        const query = `
            DELETE FROM student_scores
            WHERE academy_id = ? AND id = ?
        `;

        const [result] = await db.execute(query, [academyId, scoreId]);
        return result.affectedRows > 0;
    }
}

module.exports = StudentScoreModel;