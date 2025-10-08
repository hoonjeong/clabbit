const ExamModel = require('../models/exam.model');
const StudentScoreModel = require('../models/student-score.model');
const createLogger = require('../utils/logger');

const logger = createLogger('PerformanceController');

class PerformanceController {
    /**
     * 시험 생성
     */
    async createExam(req, res) {
        try {
            const academyId = req.academyId;
            const examData = {
                ...req.body,
                created_by: req.user.id
            };

            const exam = await ExamModel.create(academyId, examData);

            res.json({
                success: true,
                data: exam,
                message: '시험이 성공적으로 생성되었습니다.'
            });
        } catch (error) {
            logger.error('시험 생성 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 시험 목록 조회
     */
    async getExams(req, res) {
        try {
            const academyId = req.academyId;
            const filters = {
                exam_type: req.query.exam_type,
                grade_level: req.query.grade_level,
                subject: req.query.subject,
                from_date: req.query.from_date,
                to_date: req.query.to_date,
                limit: req.query.limit || 20,
                offset: req.query.offset || 0
            };

            const exams = await ExamModel.findAll(academyId, filters);

            res.json({
                success: true,
                data: exams,
                total: exams.length
            });
        } catch (error) {
            logger.error('시험 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 시험 상세 조회
     */
    async getExamDetail(req, res) {
        try {
            const academyId = req.academyId;
            const examId = req.params.id;

            const exam = await ExamModel.findById(academyId, examId);

            if (!exam) {
                return res.status(404).json({
                    success: false,
                    error: '시험을 찾을 수 없습니다.'
                });
            }

            // 문항 목록 조회
            exam.questions = await ExamModel.getQuestions(examId);

            res.json({
                success: true,
                data: exam
            });
        } catch (error) {
            logger.error('시험 상세 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 시험 수정
     */
    async updateExam(req, res) {
        try {
            const academyId = req.academyId;
            const examId = req.params.id;
            const updateData = req.body;

            const updated = await ExamModel.update(academyId, examId, updateData);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: '시험을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '시험이 수정되었습니다.'
            });
        } catch (error) {
            logger.error('시험 수정 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 시험 삭제
     */
    async deleteExam(req, res) {
        try {
            const academyId = req.academyId;
            const examId = req.params.id;

            const deleted = await ExamModel.delete(academyId, examId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: '시험을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '시험이 삭제되었습니다.'
            });
        } catch (error) {
            logger.error('시험 삭제 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 시험 문항 추가
     */
    async addQuestions(req, res) {
        try {
            const examId = req.params.id;
            const questions = req.body.questions;

            if (!Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '문항 데이터가 올바르지 않습니다.'
                });
            }

            const count = await ExamModel.addQuestions(examId, questions);

            res.json({
                success: true,
                message: `${count}개의 문항이 추가되었습니다.`
            });
        } catch (error) {
            logger.error('문항 추가 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 시험 문항 목록 조회
     */
    async getQuestions(req, res) {
        try {
            const examId = req.params.id;
            const questions = await ExamModel.getQuestions(examId);

            res.json({
                success: true,
                data: questions
            });
        } catch (error) {
            logger.error('문항 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 입력
     */
    async createScore(req, res) {
        try {
            const academyId = req.academyId;
            const scoreData = {
                ...req.body,
                graded_by: req.user.id
            };

            const score = await StudentScoreModel.create(academyId, scoreData);

            res.json({
                success: true,
                data: score,
                message: '성적이 입력되었습니다.'
            });
        } catch (error) {
            logger.error('성적 입력 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 일괄 입력
     */
    async bulkCreateScores(req, res) {
        try {
            const academyId = req.academyId;
            const { exam_id, scores } = req.body;

            if (!Array.isArray(scores) || scores.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '성적 데이터가 올바르지 않습니다.'
                });
            }

            // 채점자 정보 추가
            scores.forEach(score => {
                score.graded_by = req.user.id;
            });

            const result = await StudentScoreModel.bulkCreate(academyId, exam_id, scores);

            res.json({
                success: true,
                data: result,
                message: result.message
            });
        } catch (error) {
            logger.error('성적 일괄 입력 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 목록 조회
     */
    async getScores(req, res) {
        try {
            const academyId = req.academyId;
            const filters = {
                exam_id: req.query.exam_id,
                student_id: req.query.student_id,
                from_date: req.query.from_date,
                to_date: req.query.to_date,
                limit: req.query.limit || 50,
                offset: req.query.offset || 0
            };

            const scores = await StudentScoreModel.findAll(academyId, filters);

            res.json({
                success: true,
                data: scores
            });
        } catch (error) {
            logger.error('성적 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 상세 조회
     */
    async getScoreDetail(req, res) {
        try {
            const academyId = req.academyId;
            const scoreId = req.params.id;

            const score = await StudentScoreModel.findById(academyId, scoreId);

            if (!score) {
                return res.status(404).json({
                    success: false,
                    error: '성적을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                data: score
            });
        } catch (error) {
            logger.error('성적 상세 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 수정
     */
    async updateScore(req, res) {
        try {
            const academyId = req.academyId;
            const scoreId = req.params.id;
            const updateData = {
                ...req.body,
                graded_by: req.user.id
            };

            const updated = await StudentScoreModel.update(academyId, scoreId, updateData);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: '성적을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '성적이 수정되었습니다.'
            });
        } catch (error) {
            logger.error('성적 수정 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 삭제
     */
    async deleteScore(req, res) {
        try {
            const academyId = req.academyId;
            const scoreId = req.params.id;

            const deleted = await StudentScoreModel.delete(academyId, scoreId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: '성적을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '성적이 삭제되었습니다.'
            });
        } catch (error) {
            logger.error('성적 삭제 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 학생별 성적 이력 조회
     */
    async getStudentScores(req, res) {
        try {
            const academyId = req.academyId;
            const studentId = req.params.studentId;
            const options = {
                subject: req.query.subject,
                exam_type: req.query.exam_type,
                from_date: req.query.from_date,
                limit: req.query.limit || 20
            };

            const scores = await StudentScoreModel.findByStudent(academyId, studentId, options);

            res.json({
                success: true,
                data: scores
            });
        } catch (error) {
            logger.error('학생별 성적 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 학생 성적 추이 분석
     */
    async getStudentTrend(req, res) {
        try {
            const academyId = req.academyId;
            const studentId = req.params.studentId;
            const subject = req.query.subject;
            const months = parseInt(req.query.months) || 6;

            const trend = await StudentScoreModel.analyzeTrend(academyId, studentId, subject, months);

            res.json({
                success: true,
                data: trend
            });
        } catch (error) {
            logger.error('성적 추이 분석 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 영역별 분석
     */
    async getScoreAnalysis(req, res) {
        try {
            const scoreId = req.params.id;
            await StudentScoreModel.createAnalysis(scoreId);

            const academyId = req.academyId;
            const score = await StudentScoreModel.findById(academyId, scoreId);

            res.json({
                success: true,
                data: score.analysis || []
            });
        } catch (error) {
            logger.error('영역별 분석 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 시험 통계 조회
     */
    async getExamStatistics(req, res) {
        try {
            const academyId = req.academyId;
            const examId = req.params.id;

            const statistics = await ExamModel.getStatistics(academyId, examId);

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('시험 통계 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 공유 알림 전송
     */
    async notifyScore(req, res) {
        try {
            const academyId = req.academyId;
            const scoreId = req.params.scoreId;
            const { notification_type = 'SMS' } = req.body;

            // 성적 정보 조회
            const score = await StudentScoreModel.findById(academyId, scoreId);

            if (!score) {
                return res.status(404).json({
                    success: false,
                    error: '성적을 찾을 수 없습니다.'
                });
            }

            // TODO: 실제 알림 전송 구현
            // SMS, 이메일, 앱 푸시 등

            // 알림 이력 저장
            const query = `
                INSERT INTO score_notifications (academy_id, score_id, notification_type, sent_to)
                VALUES (?, ?, ?, ?)
            `;

            const db = require('../config/database');
            await db.execute(query, [
                academyId,
                scoreId,
                notification_type,
                score.parent_phone || score.student_phone
            ]);

            res.json({
                success: true,
                message: '성적 알림이 전송되었습니다.'
            });
        } catch (error) {
            logger.error('성적 알림 전송 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new PerformanceController();