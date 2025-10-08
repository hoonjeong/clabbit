const AnnouncementModel = require('../models/announcement.model');
const MessageModel = require('../models/message.model');
const NotificationModel = require('../models/notification.model');
const StudentModel = require('../models/student.model');
const path = require('path');
const fs = require('fs').promises;

/**
 * 소통 관리 서비스
 * 공지사항, 메시지, 알림 관련 비즈니스 로직
 */
class CommunicationService {
  /**
   * 공지사항 발행 및 알림 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} announcementData - 공지사항 데이터
   * @returns {Promise<Object>} 생성 결과
   */
  static async publishAnnouncement(academyId, announcementData) {
    // 공지사항 생성
    const announcementId = await AnnouncementModel.create(academyId, {
      ...announcementData,
      published_at: new Date()
    });

    // 대상 사용자 결정
    let targetUserIds = [];

    if (announcementData.target_type === 'all') {
      // 전체: 학원의 모든 사용자
      targetUserIds = await this.getAllAcademyUsers(academyId);
    } else if (announcementData.target_type === 'custom' && announcementData.target_ids) {
      targetUserIds = announcementData.target_ids;
    }

    // 알림 생성
    if (targetUserIds.length > 0) {
      await NotificationModel.createBulk(academyId, targetUserIds, {
        notification_type: 'announcement',
        title: `새 공지사항: ${announcementData.title}`,
        content: announcementData.content.substring(0, 100) + '...',
        link_type: 'announcement',
        link_id: announcementId
      });
    }

    return {
      announcementId,
      notificationCount: targetUserIds.length
    };
  }

  /**
   * 메시지 전송 및 알림
   * @param {number} academyId - 학원 ID
   * @param {Object} messageData - 메시지 데이터
   * @returns {Promise<Object>} 전송 결과
   */
  static async sendMessage(academyId, messageData) {
    const { conversation_id, sender_id, sender_type, content, attachments } = messageData;

    // 메시지 생성
    const messageId = await MessageModel.createMessage({
      conversation_id,
      sender_id,
      sender_type,
      content
    });

    // 첨부파일 처리
    if (attachments && attachments.length > 0) {
      for (const attachment of attachments) {
        await MessageModel.addAttachment(messageId, attachment);
      }
    }

    // 대화방 참여자 조회
    const participants = await MessageModel.getParticipants(conversation_id);

    // 발신자를 제외한 참여자에게 알림
    const recipientIds = participants
      .filter(p => p.user_id !== sender_id)
      .map(p => p.user_id);

    if (recipientIds.length > 0) {
      await NotificationModel.createBulk(academyId, recipientIds, {
        notification_type: 'message',
        title: '새 메시지',
        content: content.substring(0, 100),
        link_type: 'conversation',
        link_id: conversation_id
      });
    }

    return {
      messageId,
      recipientCount: recipientIds.length
    };
  }

  /**
   * 학원의 모든 사용자 ID 조회
   * @param {number} academyId - 학원 ID
   * @returns {Promise<Array<number>>} 사용자 ID 목록
   */
  static async getAllAcademyUsers(academyId) {
    const db = require('../config/database');
    const query = `
      SELECT user_id FROM user_academy_roles
      WHERE academy_id = ?
    `;
    const [rows] = await db.execute(query, [academyId]);
    return rows.map(row => row.user_id);
  }

  /**
   * 파일 업로드 처리
   * @param {Object} file - 업로드된 파일
   * @param {string} type - 파일 타입 (announcement, message)
   * @returns {Promise<Object>} 파일 정보
   */
  static async handleFileUpload(file, type) {
    const uploadDir = path.join(process.cwd(), 'uploads', type);

    // 디렉토리 생성
    await fs.mkdir(uploadDir, { recursive: true });

    const fileName = `${Date.now()}_${file.name}`;
    const filePath = path.join(uploadDir, fileName);

    // 파일 저장
    await file.mv(filePath);

    return {
      file_name: file.name,
      file_path: `/uploads/${type}/${fileName}`,
      file_type: file.mimetype,
      file_size: file.size
    };
  }

  /**
   * 대화 통계 조회
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<Object>} 통계 정보
   */
  static async getConversationStats(academyId, userId) {
    const conversations = await MessageModel.findConversationsByUser(academyId, userId);
    const unreadCount = await MessageModel.getTotalUnreadCount(academyId, userId);
    const notificationCount = await NotificationModel.getUnreadCount(academyId, userId);

    return {
      total_conversations: conversations.length,
      unread_messages: unreadCount,
      unread_notifications: notificationCount,
      recent_conversations: conversations.slice(0, 5)
    };
  }

  /**
   * 공지사항 통계 조회
   * @param {number} academyId - 학원 ID
   * @returns {Promise<Object>} 통계 정보
   */
  static async getAnnouncementStats(academyId) {
    const db = require('../config/database');

    // 전체 공지사항 수
    const totalQuery = 'SELECT COUNT(*) as total FROM announcements WHERE academy_id = ?';
    const [totalRows] = await db.execute(totalQuery, [academyId]);

    // 오늘 발행된 공지사항 수
    const todayQuery = `
      SELECT COUNT(*) as today FROM announcements
      WHERE academy_id = ? AND DATE(published_at) = CURDATE()
    `;
    const [todayRows] = await db.execute(todayQuery, [academyId]);

    // 우선순위별 개수
    const priorityQuery = `
      SELECT priority, COUNT(*) as count FROM announcements
      WHERE academy_id = ? AND published_at IS NOT NULL
      GROUP BY priority
    `;
    const [priorityRows] = await db.execute(priorityQuery, [academyId]);

    const priorityStats = {};
    priorityRows.forEach(row => {
      priorityStats[row.priority] = row.count;
    });

    return {
      total: totalRows[0].total,
      today: todayRows[0].today,
      by_priority: priorityStats
    };
  }

  /**
   * 학생과의 대화방 생성 또는 찾기
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @param {number} teacherId - 선생님 ID
   * @returns {Promise<Object>} 대화방 정보
   */
  static async getOrCreateStudentConversation(academyId, studentId, teacherId) {
    const conversationId = await MessageModel.findOrCreateStudentConversation(
      academyId,
      studentId,
      teacherId
    );

    const conversation = await MessageModel.findConversationById(academyId, conversationId);
    const messages = await MessageModel.findMessagesByConversation(conversationId, { limit: 50 });

    return {
      conversation,
      messages
    };
  }

  /**
   * 읽지 않은 알림 요약
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<Object>} 알림 요약
   */
  static async getUnreadNotificationSummary(academyId, userId) {
    const total = await NotificationModel.getUnreadCount(academyId, userId);
    const byType = await NotificationModel.getUnreadCountByType(academyId, userId);

    return {
      total,
      by_type: byType
    };
  }

  /**
   * 이미지 썸네일 생성 (향후 구현)
   * @param {string} imagePath - 이미지 경로
   * @returns {Promise<string>} 썸네일 경로
   */
  static async generateThumbnail(imagePath) {
    // TODO: sharp 또는 jimp 라이브러리를 사용한 썸네일 생성
    return imagePath; // 현재는 원본 반환
  }
}

module.exports = CommunicationService;
