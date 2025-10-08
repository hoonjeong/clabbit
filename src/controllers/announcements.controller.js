const AnnouncementModel = require('../models/announcement.model');
const CommunicationService = require('../services/communication.service');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 공지사항 관리 컨트롤러
 */
class AnnouncementsController {
  /**
   * 공지사항 목록 조회
   * @route GET /api/announcements
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const {
        priority,
        target_type,
        search,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;

      const offset = (page - 1) * limit;

      const filters = {
        priority,
        target_type,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include_unpublished: req.user.role === 'admin'
      };

      const announcements = await AnnouncementModel.findAll(academyId, filters);
      const total = await AnnouncementModel.count(academyId, filters);

      return successResponse(res, {
        announcements,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('공지사항 목록 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 공지사항 상세 조회
   * @route GET /api/announcements/:id
   */
  static async getDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const announcement = await AnnouncementModel.findById(academyId, id);
      if (!announcement) {
        return errorResponse(res, '공지사항을 찾을 수 없습니다.', 404);
      }

      // 조회수 증가
      await AnnouncementModel.incrementViews(academyId, id);

      // 읽음 상태 기록
      await AnnouncementModel.markAsRead(id, req.user.id);

      // 첨부파일 조회
      const attachments = await AnnouncementModel.getAttachments(id);

      return successResponse(res, {
        announcement,
        attachments
      });
    } catch (error) {
      console.error('공지사항 상세 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 공지사항 생성
   * @route POST /api/announcements
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const announcementData = {
        ...req.body,
        author_id: req.user.id
      };

      // 공지사항 발행 및 알림 전송
      const result = await CommunicationService.publishAnnouncement(
        academyId,
        announcementData
      );

      // 첨부파일 처리
      if (req.files && req.files.attachments) {
        const files = Array.isArray(req.files.attachments)
          ? req.files.attachments
          : [req.files.attachments];

        for (const file of files) {
          const fileData = await CommunicationService.handleFileUpload(file, 'announcements');
          await AnnouncementModel.addAttachment(result.announcementId, fileData);
        }
      }

      return successResponse(res, {
        message: '공지사항이 발행되었습니다.',
        announcementId: result.announcementId,
        notificationCount: result.notificationCount
      }, 201);
    } catch (error) {
      console.error('공지사항 생성 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 공지사항 수정
   * @route PUT /api/announcements/:id
   */
  static async update(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      // 기존 공지사항 확인
      const existing = await AnnouncementModel.findById(academyId, id);
      if (!existing) {
        return errorResponse(res, '공지사항을 찾을 수 없습니다.', 404);
      }

      // 작성자 또는 관리자만 수정 가능
      if (existing.author_id !== req.user.id && req.user.role !== 'admin') {
        return errorResponse(res, '수정 권한이 없습니다.', 403);
      }

      const success = await AnnouncementModel.update(academyId, id, req.body);

      if (!success) {
        return errorResponse(res, '공지사항 수정에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '공지사항이 수정되었습니다.'
      });
    } catch (error) {
      console.error('공지사항 수정 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 공지사항 삭제
   * @route DELETE /api/announcements/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      // 기존 공지사항 확인
      const existing = await AnnouncementModel.findById(academyId, id);
      if (!existing) {
        return errorResponse(res, '공지사항을 찾을 수 없습니다.', 404);
      }

      // 작성자 또는 관리자만 삭제 가능
      if (existing.author_id !== req.user.id && req.user.role !== 'admin') {
        return errorResponse(res, '삭제 권한이 없습니다.', 403);
      }

      const success = await AnnouncementModel.delete(academyId, id);

      if (!success) {
        return errorResponse(res, '공지사항 삭제에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '공지사항이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('공지사항 삭제 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 공지사항 통계 조회
   * @route GET /api/announcements/stats
   */
  static async getStats(req, res) {
    try {
      const academyId = req.academyId;
      const stats = await CommunicationService.getAnnouncementStats(academyId);

      return successResponse(res, stats);
    } catch (error) {
      console.error('공지사항 통계 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = AnnouncementsController;
