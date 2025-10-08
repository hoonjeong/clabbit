const db = require('../config/database');

/**
 * 메시지 데이터 모델
 * 학원별로 격리된 메시지 관리
 */
class MessageModel {
  /**
   * 대화방 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} data - 대화방 데이터
   * @returns {Promise<number>} 생성된 대화방 ID
   */
  static async createConversation(academyId, data) {
    const query = `
      INSERT INTO message_conversations (
        academy_id, student_id, title, conversation_type, created_by
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      academyId,
      data.student_id || null,
      data.title || null,
      data.conversation_type || 'teacher-student',
      data.created_by
    ]);
    return result.insertId;
  }

  /**
   * 대화방 참여자 추가
   * @param {number} conversationId - 대화방 ID
   * @param {number} userId - 사용자 ID
   * @param {string} userType - 사용자 유형
   * @returns {Promise<number>} 참여자 ID
   */
  static async addParticipant(conversationId, userId, userType) {
    const query = `
      INSERT INTO conversation_participants (conversation_id, user_id, user_type)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE joined_at = CURRENT_TIMESTAMP
    `;
    const [result] = await db.execute(query, [conversationId, userId, userType]);
    return result.insertId;
  }

  /**
   * 사용자의 모든 대화방 조회
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<Array>} 대화방 목록
   */
  static async findConversationsByUser(academyId, userId) {
    const query = `
      SELECT
        mc.*,
        cp.unread_count,
        cp.last_read_at,
        (SELECT content FROM messages
         WHERE conversation_id = mc.id
         ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM conversation_participants
         WHERE conversation_id = mc.id) as participant_count
      FROM message_conversations mc
      JOIN conversation_participants cp ON mc.id = cp.conversation_id
      WHERE mc.academy_id = ? AND cp.user_id = ?
      ORDER BY mc.last_message_at DESC, mc.updated_at DESC
    `;
    const [rows] = await db.execute(query, [academyId, userId]);
    return rows;
  }

  /**
   * 특정 대화방 조회
   * @param {number} academyId - 학원 ID
   * @param {number} conversationId - 대화방 ID
   * @returns {Promise<Object|null>} 대화방 정보
   */
  static async findConversationById(academyId, conversationId) {
    const query = `
      SELECT mc.*,
        (SELECT COUNT(*) FROM conversation_participants
         WHERE conversation_id = mc.id) as participant_count
      FROM message_conversations mc
      WHERE mc.academy_id = ? AND mc.id = ?
    `;
    const [rows] = await db.execute(query, [academyId, conversationId]);
    return rows[0] || null;
  }

  /**
   * 대화방의 참여자 목록 조회
   * @param {number} conversationId - 대화방 ID
   * @returns {Promise<Array>} 참여자 목록
   */
  static async getParticipants(conversationId) {
    const query = `
      SELECT cp.*, u.owner_name as user_name, u.email
      FROM conversation_participants cp
      JOIN users u ON cp.user_id = u.id
      WHERE cp.conversation_id = ?
    `;
    const [rows] = await db.execute(query, [conversationId]);
    return rows;
  }

  /**
   * 메시지 생성
   * @param {Object} data - 메시지 데이터
   * @returns {Promise<number>} 생성된 메시지 ID
   */
  static async createMessage(data) {
    const query = `
      INSERT INTO messages (
        conversation_id, sender_id, sender_type, message_type, content
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      data.conversation_id,
      data.sender_id,
      data.sender_type,
      data.message_type || 'text',
      data.content
    ]);

    // 대화방의 last_message_at 업데이트
    await db.execute(
      'UPDATE message_conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?',
      [data.conversation_id]
    );

    // 참여자들의 unread_count 증가 (발신자 제외)
    await db.execute(
      `UPDATE conversation_participants
       SET unread_count = unread_count + 1
       WHERE conversation_id = ? AND user_id != ?`,
      [data.conversation_id, data.sender_id]
    );

    return result.insertId;
  }

  /**
   * 대화방의 메시지 목록 조회
   * @param {number} conversationId - 대화방 ID
   * @param {Object} options - 옵션
   * @returns {Promise<Array>} 메시지 목록
   */
  static async findMessagesByConversation(conversationId, options = {}) {
    let query = `
      SELECT m.*, u.owner_name as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = ?
      ORDER BY m.created_at DESC
    `;
    const params = [conversationId];

    if (options.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(options.limit), parseInt(options.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows.reverse(); // 최신순으로 정렬
  }

  /**
   * 메시지 읽음 처리
   * @param {number} conversationId - 대화방 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async markMessagesAsRead(conversationId, userId) {
    // 메시지 읽음 처리
    await db.execute(
      `UPDATE messages
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE`,
      [conversationId, userId]
    );

    // 참여자의 unread_count 초기화 및 last_read_at 업데이트
    const [result] = await db.execute(
      `UPDATE conversation_participants
       SET unread_count = 0, last_read_at = CURRENT_TIMESTAMP
       WHERE conversation_id = ? AND user_id = ?`,
      [conversationId, userId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 메시지 첨부파일 추가
   * @param {number} messageId - 메시지 ID
   * @param {Object} fileData - 파일 데이터
   * @returns {Promise<number>} 첨부파일 ID
   */
  static async addAttachment(messageId, fileData) {
    const query = `
      INSERT INTO message_attachments (
        message_id, file_name, file_path, file_type, file_size, thumbnail_path
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      messageId,
      fileData.file_name,
      fileData.file_path,
      fileData.file_type,
      fileData.file_size,
      fileData.thumbnail_path || null
    ]);
    return result.insertId;
  }

  /**
   * 메시지의 첨부파일 조회
   * @param {number} messageId - 메시지 ID
   * @returns {Promise<Array>} 첨부파일 목록
   */
  static async getAttachments(messageId) {
    const query = 'SELECT * FROM message_attachments WHERE message_id = ?';
    const [rows] = await db.execute(query, [messageId]);
    return rows;
  }

  /**
   * 대화방 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} conversationId - 대화방 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async deleteConversation(academyId, conversationId) {
    const query = 'DELETE FROM message_conversations WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, conversationId]);
    return result.affectedRows > 0;
  }

  /**
   * 사용자의 읽지 않은 메시지 총 개수
   * @param {number} academyId - 학원 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<number>} 읽지 않은 메시지 개수
   */
  static async getTotalUnreadCount(academyId, userId) {
    const query = `
      SELECT SUM(cp.unread_count) as total_unread
      FROM conversation_participants cp
      JOIN message_conversations mc ON cp.conversation_id = mc.id
      WHERE mc.academy_id = ? AND cp.user_id = ?
    `;
    const [rows] = await db.execute(query, [academyId, userId]);
    return rows[0].total_unread || 0;
  }

  /**
   * 학생과의 대화방 찾기 (없으면 생성)
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @param {number} teacherId - 선생님 ID
   * @returns {Promise<number>} 대화방 ID
   */
  static async findOrCreateStudentConversation(academyId, studentId, teacherId) {
    // 기존 대화방 찾기
    const query = `
      SELECT mc.id FROM message_conversations mc
      WHERE mc.academy_id = ? AND mc.student_id = ?
      LIMIT 1
    `;
    const [rows] = await db.execute(query, [academyId, studentId]);

    if (rows.length > 0) {
      return rows[0].id;
    }

    // 새 대화방 생성
    const conversationId = await this.createConversation(academyId, {
      student_id: studentId,
      conversation_type: 'teacher-student',
      created_by: teacherId
    });

    // 참여자 추가
    await this.addParticipant(conversationId, teacherId, 'teacher');

    return conversationId;
  }
}

module.exports = MessageModel;
