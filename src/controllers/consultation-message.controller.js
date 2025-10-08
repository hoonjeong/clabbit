/**
 * 상담톡 메시지 컨트롤러
 * WebSocket과 연동한 실시간 메시징
 */

const ConsultationMessageModel = require('../models/consultation-message.model');
const webSocketServer = require('../config/websocket');

class ConsultationMessageController {
    /**
     * 메시지 전송
     */
    async sendMessage(req, res) {
        try {
            const academyId = req.academyId;
            const senderId = req.user.id;
            const { recipientId, studentId, message, attachments } = req.body;

            // 메시지 저장
            const messageData = await ConsultationMessageModel.create(
                academyId,
                {
                    sender_id: senderId,
                    recipient_id: recipientId,
                    student_id: studentId,
                    message_content: message,
                    attachments: attachments ? JSON.stringify(attachments) : null
                }
            );

            // 대화 ID 조회 또는 생성
            let conversationId = await ConsultationMessageModel.getConversationId(
                academyId,
                senderId,
                recipientId,
                studentId
            );

            if (!conversationId) {
                conversationId = await ConsultationMessageModel.createConversation(
                    academyId,
                    senderId,
                    recipientId,
                    studentId
                );
            }

            // WebSocket으로 실시간 전송
            webSocketServer.sendNotificationToUser(recipientId, 'consultation:newMessage', {
                conversationId,
                messageId: messageData.insertId,
                senderId,
                senderName: req.user.name,
                studentId,
                message,
                attachments,
                timestamp: new Date()
            });

            res.json({
                success: true,
                data: {
                    messageId: messageData.insertId,
                    conversationId,
                    timestamp: new Date()
                }
            });
        } catch (error) {
            console.error('메시지 전송 오류:', error);
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

            const conversations = await ConsultationMessageModel.getConversations(
                academyId,
                userId
            );

            // 온라인 상태 추가
            const conversationsWithStatus = conversations.map(conv => ({
                ...conv,
                isOnline: webSocketServer.isUserOnline(
                    conv.sender_id === userId ? conv.recipient_id : conv.sender_id
                )
            }));

            res.json({
                success: true,
                data: conversationsWithStatus
            });
        } catch (error) {
            console.error('대화 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 특정 대화의 메시지 조회
     */
    async getMessages(req, res) {
        try {
            const academyId = req.academyId;
            const userId = req.user.id;
            const { conversationId } = req.params;
            const { limit = 50, offset = 0 } = req.query;

            // 대화 접근 권한 확인
            const hasAccess = await ConsultationMessageModel.checkConversationAccess(
                academyId,
                conversationId,
                userId
            );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    error: '접근 권한이 없습니다.'
                });
            }

            const messages = await ConsultationMessageModel.getMessages(
                academyId,
                conversationId,
                parseInt(limit),
                parseInt(offset)
            );

            // 읽지 않은 메시지 읽음 처리
            const unreadMessageIds = messages
                .filter(msg => msg.recipient_id === userId && !msg.is_read)
                .map(msg => msg.id);

            if (unreadMessageIds.length > 0) {
                await ConsultationMessageModel.markAsRead(
                    academyId,
                    unreadMessageIds,
                    userId
                );

                // 발신자에게 읽음 알림
                const senderId = messages.find(msg => unreadMessageIds.includes(msg.id))?.sender_id;
                if (senderId) {
                    webSocketServer.sendNotificationToUser(senderId, 'consultation:messagesRead', {
                        conversationId,
                        messageIds: unreadMessageIds,
                        readBy: userId,
                        readAt: new Date()
                    });
                }
            }

            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            console.error('메시지 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 읽음 처리
     */
    async markAsRead(req, res) {
        try {
            const academyId = req.academyId;
            const userId = req.user.id;
            const { messageIds } = req.body;

            if (!Array.isArray(messageIds) || messageIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '유효한 메시지 ID가 필요합니다.'
                });
            }

            const result = await ConsultationMessageModel.markAsRead(
                academyId,
                messageIds,
                userId
            );

            res.json({
                success: true,
                data: {
                    updatedCount: result.affectedRows
                }
            });
        } catch (error) {
            console.error('읽음 처리 오류:', error);
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

            const count = await ConsultationMessageModel.getUnreadCount(
                academyId,
                userId
            );

            res.json({
                success: true,
                data: {
                    unreadCount: count
                }
            });
        } catch (error) {
            console.error('읽지 않은 메시지 수 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 삭제 (소프트 삭제)
     */
    async deleteMessage(req, res) {
        try {
            const academyId = req.academyId;
            const userId = req.user.id;
            const { messageId } = req.params;

            // 메시지 소유권 확인
            const message = await ConsultationMessageModel.findById(
                academyId,
                messageId
            );

            if (!message) {
                return res.status(404).json({
                    success: false,
                    error: '메시지를 찾을 수 없습니다.'
                });
            }

            if (message.sender_id !== userId) {
                return res.status(403).json({
                    success: false,
                    error: '삭제 권한이 없습니다.'
                });
            }

            await ConsultationMessageModel.softDelete(
                academyId,
                messageId
            );

            // WebSocket으로 삭제 알림
            webSocketServer.sendNotificationToUser(message.recipient_id, 'consultation:messageDeleted', {
                conversationId: message.conversation_id,
                messageId,
                deletedBy: userId,
                deletedAt: new Date()
            });

            res.json({
                success: true,
                message: '메시지가 삭제되었습니다.'
            });
        } catch (error) {
            console.error('메시지 삭제 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 검색
     */
    async searchMessages(req, res) {
        try {
            const academyId = req.academyId;
            const userId = req.user.id;
            const { query, studentId, dateFrom, dateTo } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: '검색어를 입력해주세요.'
                });
            }

            const messages = await ConsultationMessageModel.searchMessages(
                academyId,
                userId,
                {
                    query,
                    studentId,
                    dateFrom,
                    dateTo
                }
            );

            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            console.error('메시지 검색 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 파일 첨부 업로드
     */
    async uploadAttachment(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: '파일이 없습니다.'
                });
            }

            const fileInfo = {
                filename: req.file.filename,
                originalName: req.file.originalname,
                size: req.file.size,
                mimetype: req.file.mimetype,
                url: `/uploads/consultation/${req.file.filename}`
            };

            res.json({
                success: true,
                data: fileInfo
            });
        } catch (error) {
            console.error('파일 업로드 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new ConsultationMessageController();