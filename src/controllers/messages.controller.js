const MessageModel = require('../models/message.model');
const CommunicationService = require('../services/communication.service');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 메시지 관리 컨트롤러
 */
class MessagesController {
  /**
   * 대화방 목록 조회
   * @route GET /api/messages/conversations
   */
  static async getConversations(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;

      const conversations = await MessageModel.findConversationsByUser(academyId, userId);

      return successResponse(res, {
        conversations
      });
    } catch (error) {
      console.error('대화방 목록 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 특정 대화방의 메시지 조회
   * @route GET /api/messages/conversations/:conversationId
   */
  static async getMessages(req, res) {
    try {
      const academyId = req.academyId;
      const { conversationId } = req.params;
      const {
        page = PAGINATION.DEFAULT_PAGE,
        limit = 50
      } = req.query;

      const offset = (page - 1) * limit;

      // 대화방 확인
      const conversation = await MessageModel.findConversationById(academyId, conversationId);
      if (!conversation) {
        return errorResponse(res, '대화방을 찾을 수 없습니다.', 404);
      }

      // 메시지 조회
      const messages = await MessageModel.findMessagesByConversation(conversationId, {
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      // 읽음 처리
      await MessageModel.markMessagesAsRead(conversationId, req.user.id);

      return successResponse(res, {
        conversation,
        messages
      });
    } catch (error) {
      console.error('메시지 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 메시지 전송
   * @route POST /api/messages/conversations/:conversationId/messages
   */
  static async sendMessage(req, res) {
    try {
      const academyId = req.academyId;
      const { conversationId } = req.params;
      const { content, message_type = 'text' } = req.body;

      // 대화방 확인
      const conversation = await MessageModel.findConversationById(academyId, conversationId);
      if (!conversation) {
        return errorResponse(res, '대화방을 찾을 수 없습니다.', 404);
      }

      // 메시지 데이터 준비
      const messageData = {
        conversation_id: conversationId,
        sender_id: req.user.id,
        sender_type: 'teacher', // TODO: 사용자 역할에 따라 동적 설정
        content,
        message_type,
        attachments: []
      };

      // 첨부파일 처리
      if (req.files && req.files.attachments) {
        const files = Array.isArray(req.files.attachments)
          ? req.files.attachments
          : [req.files.attachments];

        for (const file of files) {
          const fileData = await CommunicationService.handleFileUpload(file, 'messages');
          messageData.attachments.push(fileData);
        }
      }

      // 메시지 전송 및 알림
      const result = await CommunicationService.sendMessage(academyId, messageData);

      return successResponse(res, {
        message: '메시지가 전송되었습니다.',
        messageId: result.messageId
      }, 201);
    } catch (error) {
      console.error('메시지 전송 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 대화방 생성
   * @route POST /api/messages/conversations
   */
  static async createConversation(req, res) {
    try {
      const academyId = req.academyId;
      const { student_id, title, conversation_type } = req.body;

      const conversationData = {
        student_id,
        title,
        conversation_type: conversation_type || 'teacher-student',
        created_by: req.user.id
      };

      const conversationId = await MessageModel.createConversation(academyId, conversationData);

      // 생성자를 참여자로 추가
      await MessageModel.addParticipant(conversationId, req.user.id, 'teacher');

      return successResponse(res, {
        message: '대화방이 생성되었습니다.',
        conversationId
      }, 201);
    } catch (error) {
      console.error('대화방 생성 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 학생과의 대화방 조회 또는 생성
   * @route GET /api/messages/student/:studentId
   */
  static async getStudentConversation(req, res) {
    try {
      const academyId = req.academyId;
      const { studentId } = req.params;

      const result = await CommunicationService.getOrCreateStudentConversation(
        academyId,
        studentId,
        req.user.id
      );

      return successResponse(res, result);
    } catch (error) {
      console.error('학생 대화방 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 대화방 삭제
   * @route DELETE /api/messages/conversations/:conversationId
   */
  static async deleteConversation(req, res) {
    try {
      const academyId = req.academyId;
      const { conversationId } = req.params;

      const success = await MessageModel.deleteConversation(academyId, conversationId);

      if (!success) {
        return errorResponse(res, '대화방 삭제에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '대화방이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('대화방 삭제 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 읽지 않은 메시지 개수 조회
   * @route GET /api/messages/unread-count
   */
  static async getUnreadCount(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;

      const unreadCount = await MessageModel.getTotalUnreadCount(academyId, userId);

      return successResponse(res, {
        unreadCount
      });
    } catch (error) {
      console.error('읽지 않은 메시지 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 대화 통계 조회
   * @route GET /api/messages/stats
   */
  static async getStats(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;

      const stats = await CommunicationService.getConversationStats(academyId, userId);

      return successResponse(res, stats);
    } catch (error) {
      console.error('대화 통계 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = MessagesController;
