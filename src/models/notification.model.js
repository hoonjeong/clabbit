const db = require('../config/database');

/**
 * 알림 데이터 모델
 * 학원별로 격리된 알림 관리
 */
class NotificationModel {
  /**
   * 알림 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} data - 알림 데이터
   * @returns {Promise<number>} 생성된 알림 ID
   */
  static async create(academyId, data) {
    const query = `
      INSERT INTO notifications (
        academy_id, user_id, notification_type, title, content,
        link_type, link_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      academyId,
      data.user_id,
      data.notification_type,
      data.title,
      data.content,
      data.link_type || null,
      data.link_id || null
    ]);
    return result.insertId;
  }

  /**
   * 사용자의 알림 목록 조회
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @param {Object} options - 옵션
   * @returns {Promise<Array>} 알림 목록
   */
  static async findByUser(academyId, userId, options = {}) {
    let query = `
      SELECT * FROM notifications
      WHERE academy_id = ? AND user_id = ?
    `;
    const params = [academyId, userId];

    if (options.is_read !== undefined) {
      query += ' AND is_read = ?';
      params.push(options.is_read);
    }

    if (options.notification_type) {
      query += ' AND notification_type = ?';
      params.push(options.notification_type);
    }

    query += ' ORDER BY created_at DESC';

    if (options.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(options.limit), parseInt(options.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 알림 읽음 처리
   * @param {number} academyId - 학원 ID
   * @param {number} id - 알림 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async markAsRead(academyId, id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE academy_id = ? AND id = ? AND user_id = ?
    `;
    const [result] = await db.execute(query, [academyId, id, userId]);
    return result.affectedRows > 0;
  }

  /**
   * 모든 알림 읽음 처리
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async markAllAsRead(academyId, userId) {
    const query = `
      UPDATE notifications
      SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
      WHERE academy_id = ? AND user_id = ? AND is_read = FALSE
    `;
    const [result] = await db.execute(query, [academyId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * 알림 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} id - 알림 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, id, userId) {
    const query = 'DELETE FROM notifications WHERE academy_id = ? AND id = ? AND user_id = ?';
    const [result] = await db.execute(query, [academyId, id, userId]);
    return result.affectedRows > 0;
  }

  /**
   * 읽지 않은 알림 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<number>} 읽지 않은 알림 개수
   */
  static async getUnreadCount(academyId, userId) {
    const query = `
      SELECT COUNT(*) as count FROM notifications
      WHERE academy_id = ? AND user_id = ? AND is_read = FALSE
    `;
    const [rows] = await db.execute(query, [academyId, userId]);
    return rows[0].count;
  }

  /**
   * 알림 타입별 읽지 않은 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<Object>} 타입별 개수
   */
  static async getUnreadCountByType(academyId, userId) {
    const query = `
      SELECT notification_type, COUNT(*) as count
      FROM notifications
      WHERE academy_id = ? AND user_id = ? AND is_read = FALSE
      GROUP BY notification_type
    `;
    const [rows] = await db.execute(query, [academyId, userId]);

    const result = {};
    rows.forEach(row => {
      result[row.notification_type] = row.count;
    });
    return result;
  }

  /**
   * 특정 알림 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 알림 ID
   * @returns {Promise<Object|null>} 알림 정보
   */
  static async findById(academyId, id) {
    const query = 'SELECT * FROM notifications WHERE academy_id = ? AND id = ?';
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0] || null;
  }

  /**
   * 일괄 알림 생성 (여러 사용자에게)
   * @param {number} academyId - 학원 ID
   * @param {Array<number>} userIds - 사용자 ID 목록
   * @param {Object} notificationData - 알림 데이터
   * @returns {Promise<number>} 생성된 알림 개수
   */
  static async createBulk(academyId, userIds, notificationData) {
    if (!userIds || userIds.length === 0) {
      return 0;
    }

    const values = userIds.map(userId => [
      academyId,
      userId,
      notificationData.notification_type,
      notificationData.title,
      notificationData.content,
      notificationData.link_type || null,
      notificationData.link_id || null
    ]);

    const query = `
      INSERT INTO notifications (
        academy_id, user_id, notification_type, title, content,
        link_type, link_id
      ) VALUES ?
    `;

    const [result] = await db.query(query, [values]);
    return result.affectedRows;
  }

  /**
   * 오래된 읽은 알림 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} daysOld - 오래된 일수
   * @returns {Promise<number>} 삭제된 알림 개수
   */
  static async deleteOldReadNotifications(academyId, daysOld = 30) {
    const query = `
      DELETE FROM notifications
      WHERE academy_id = ? AND is_read = TRUE
      AND read_at < DATE_SUB(NOW(), INTERVAL ? DAY)
    `;
    const [result] = await db.execute(query, [academyId, daysOld]);
    return result.affectedRows;
  }
}

module.exports = NotificationModel;
