const NotificationModel = require('../models/notification.model');
const CommunicationService = require('../services/communication.service');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 알림 관리 컨트롤러
 */
class NotificationsController {
  /**
   * 알림 목록 조회
   * @route GET /api/notifications
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;
      const {
        is_read,
        notification_type,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;

      const offset = (page - 1) * limit;

      const options = {
        is_read: is_read !== undefined ? is_read === 'true' : undefined,
        notification_type,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const notifications = await NotificationModel.findByUser(academyId, userId, options);

      return successResponse(res, {
        notifications
      });
    } catch (error) {
      console.error('알림 목록 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 알림 읽음 처리
   * @route PUT /api/notifications/:id/read
   */
  static async markAsRead(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const userId = req.user.id;

      const success = await NotificationModel.markAsRead(academyId, id, userId);

      if (!success) {
        return errorResponse(res, '알림을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        message: '알림을 읽음 처리했습니다.'
      });
    } catch (error) {
      console.error('알림 읽음 처리 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 모든 알림 읽음 처리
   * @route PUT /api/notifications/read-all
   */
  static async markAllAsRead(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;

      await NotificationModel.markAllAsRead(academyId, userId);

      return successResponse(res, {
        message: '모든 알림을 읽음 처리했습니다.'
      });
    } catch (error) {
      console.error('전체 알림 읽음 처리 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 알림 삭제
   * @route DELETE /api/notifications/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const userId = req.user.id;

      const success = await NotificationModel.delete(academyId, id, userId);

      if (!success) {
        return errorResponse(res, '알림 삭제에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '알림이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('알림 삭제 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 읽지 않은 알림 개수 조회
   * @route GET /api/notifications/unread-count
   */
  static async getUnreadCount(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;

      const count = await NotificationModel.getUnreadCount(academyId, userId);

      return successResponse(res, {
        unreadCount: count
      });
    } catch (error) {
      console.error('읽지 않은 알림 개수 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 알림 요약 조회
   * @route GET /api/notifications/summary
   */
  static async getSummary(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;

      const summary = await CommunicationService.getUnreadNotificationSummary(academyId, userId);

      return successResponse(res, summary);
    } catch (error) {
      console.error('알림 요약 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = NotificationsController;
