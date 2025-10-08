const ConsultationModel = require('../models/consultation.model');
const ConsultationMessageModel = require('../models/consultation-message.model');
const createLogger = require('../utils/logger');

const logger = createLogger('ConsultationController');

class ConsultationController {
    /**
     * 상담 분류 생성
     */
    async createCategory(req, res) {
        try {
            const academyId = req.academyId;
            const categoryData = req.body;

            const category = await ConsultationModel.createCategory(academyId, categoryData);

            res.json({
                success: true,
                data: category,
                message: '상담 분류가 생성되었습니다.'
            });
        } catch (error) {
            logger.error('상담 분류 생성 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 분류 목록 조회
     */
    async getCategories(req, res) {
        try {
            const academyId = req.academyId;
            const categories = await ConsultationModel.getCategories(academyId);

            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            logger.error('상담 분류 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 기록 생성
     */
    async createConsultation(req, res) {
        try {
            const academyId = req.academyId;
            const consultationData = {
                ...req.body,
                consultant_id: req.user.id
            };

            const consultation = await ConsultationModel.create(academyId, consultationData);

            res.json({
                success: true,
                data: consultation,
                message: '상담 기록이 생성되었습니다.'
            });
        } catch (error) {
            logger.error('상담 생성 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 기록 목록 조회
     */
    async getConsultations(req, res) {
        try {
            const academyId = req.academyId;
            const filters = {
                student_id: req.query.student_id,
                consultant_id: req.query.consultant_id,
                category_id: req.query.category_id,
                status: req.query.status,
                from_date: req.query.from_date,
                to_date: req.query.to_date,
                is_important: req.query.is_important === 'true',
                follow_up_required: req.query.follow_up_required === 'true',
                limit: req.query.limit || 20,
                offset: req.query.offset || 0
            };

            const consultations = await ConsultationModel.findAll(academyId, filters);

            res.json({
                success: true,
                data: consultations,
                total: consultations.length
            });
        } catch (error) {
            logger.error('상담 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 기록 상세 조회
     */
    async getConsultationDetail(req, res) {
        try {
            const academyId = req.academyId;
            const consultationId = req.params.id;

            const consultation = await ConsultationModel.findById(academyId, consultationId);

            if (!consultation) {
                return res.status(404).json({
                    success: false,
                    error: '상담 기록을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                data: consultation
            });
        } catch (error) {
            logger.error('상담 상세 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 학생별 상담 이력 조회
     */
    async getStudentConsultations(req, res) {
        try {
            const academyId = req.academyId;
            const studentId = req.params.studentId;

            const consultations = await ConsultationModel.findByStudent(academyId, studentId);

            res.json({
                success: true,
                data: consultations
            });
        } catch (error) {
            logger.error('학생별 상담 이력 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 기록 수정
     */
    async updateConsultation(req, res) {
        try {
            const academyId = req.academyId;
            const consultationId = req.params.id;
            const updateData = req.body;

            const updated = await ConsultationModel.update(academyId, consultationId, updateData);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: '상담 기록을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '상담 기록이 수정되었습니다.'
            });
        } catch (error) {
            logger.error('상담 수정 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 기록 삭제
     */
    async deleteConsultation(req, res) {
        try {
            const academyId = req.academyId;
            const consultationId = req.params.id;

            const deleted = await ConsultationModel.delete(academyId, consultationId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: '상담 기록을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '상담 기록이 삭제되었습니다.'
            });
        } catch (error) {
            logger.error('상담 삭제 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 중요 표시 토글
     */
    async toggleImportant(req, res) {
        try {
            const academyId = req.academyId;
            const consultationId = req.params.id;

            const toggled = await ConsultationModel.toggleImportant(academyId, consultationId);

            if (!toggled) {
                return res.status(404).json({
                    success: false,
                    error: '상담 기록을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '중요 표시가 변경되었습니다.'
            });
        } catch (error) {
            logger.error('중요 표시 토글 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 미상담자 목록 조회
     */
    async getPendingStudents(req, res) {
        try {
            const academyId = req.academyId;
            const days = parseInt(req.query.days) || 30;

            const students = await ConsultationModel.getPendingStudents(academyId, days);

            res.json({
                success: true,
                data: students,
                total: students.length
            });
        } catch (error) {
            logger.error('미상담자 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 통계 조회
     */
    async getStatistics(req, res) {
        try {
            const academyId = req.academyId;
            const options = {
                from_date: req.query.from_date,
                to_date: req.query.to_date,
                consultant_id: req.query.consultant_id
            };

            const statistics = await ConsultationModel.getStatistics(academyId, options);

            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('상담 통계 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 대시보드 데이터 조회
     */
    async getDashboard(req, res) {
        try {
            const academyId = req.academyId;

            // 이번 달 통계
            const currentMonth = new Date().toISOString().slice(0, 7);
            const statistics = await ConsultationModel.getStatistics(academyId, {
                from_date: `${currentMonth}-01`
            });

            // 미상담자
            const pendingStudents = await ConsultationModel.getPendingStudents(academyId, 30);

            // 최근 상담 목록
            const recentConsultations = await ConsultationModel.findAll(academyId, {
                limit: 10
            });

            res.json({
                success: true,
                data: {
                    statistics,
                    pending_students: pendingStudents.slice(0, 5),
                    pending_count: pendingStudents.length,
                    recent_consultations: recentConsultations
                }
            });
        } catch (error) {
            logger.error('대시보드 데이터 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 전송
     */
    async sendMessage(req, res) {
        try {
            const academyId = req.academyId;
            const messageData = {
                ...req.body,
                sender_id: req.user.id,
                sender_type: 'teacher'  // TODO: 역할에 따라 동적 설정
            };

            const message = await ConsultationMessageModel.send(academyId, messageData);

            res.json({
                success: true,
                data: message,
                message: '메시지가 전송되었습니다.'
            });
        } catch (error) {
            logger.error('메시지 전송 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 대화 목록 조회
     */
    async getConversations(req, res) {
        try {
            const academyId = req.academyId;
            const userId = req.user.id;
            const userType = 'teacher';  // TODO: 역할에 따라 동적 설정

            const conversations = await ConsultationMessageModel.getConversations(
                academyId,
                userId,
                userType
            );

            res.json({
                success: true,
                data: conversations
            });
        } catch (error) {
            logger.error('대화 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 목록 조회
     */
    async getMessages(req, res) {
        try {
            const academyId = req.academyId;
            const studentId = req.params.studentId || req.query.student_id;
            const userId = req.user.id;
            const userType = 'teacher';  // TODO: 역할에 따라 동적 설정

            const options = {
                from_date: req.query.from_date,
                limit: req.query.limit || 50,
                offset: req.query.offset || 0
            };

            const messages = await ConsultationMessageModel.getMessages(
                academyId,
                studentId,
                userId,
                userType,
                options
            );

            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            logger.error('메시지 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 읽음 처리
     */
    async markMessageAsRead(req, res) {
        try {
            const academyId = req.academyId;
            const messageId = req.params.id;
            const userId = req.user.id;
            const userType = 'teacher';  // TODO: 역할에 따라 동적 설정

            const studentId = req.body.student_id;

            const count = await ConsultationMessageModel.markAsRead(
                academyId,
                studentId,
                userId,
                userType
            );

            res.json({
                success: true,
                message: `${count}개의 메시지를 읽음 처리했습니다.`
            });
        } catch (error) {
            logger.error('메시지 읽음 처리 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 읽지 않은 메시지 수 조회
     */
    async getUnreadCount(req, res) {
        try {
            const academyId = req.academyId;
            const userId = req.user.id;
            const userType = 'teacher';  // TODO: 역할에 따라 동적 설정

            const count = await ConsultationMessageModel.getUnreadCount(
                academyId,
                userId,
                userType
            );

            res.json({
                success: true,
                data: { unread_count: count }
            });
        } catch (error) {
            logger.error('읽지 않은 메시지 수 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 삭제
     */
    async deleteMessage(req, res) {
        try {
            const academyId = req.academyId;
            const messageId = req.params.id;
            const userId = req.user.id;

            const deleted = await ConsultationMessageModel.delete(academyId, messageId, userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: '메시지를 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '메시지가 삭제되었습니다.'
            });
        } catch (error) {
            logger.error('메시지 삭제 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new ConsultationController();