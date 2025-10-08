const db = require('../config/database');

/**
 * 공지사항 데이터 모델
 * 학원별로 격리된 공지사항 관리
 */
class AnnouncementModel {
  /**
   * 모든 공지사항 조회 (필터링 및 검색 지원)
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 공지사항 목록
   */
  static async findAll(academyId, filters = {}) {
    let query = `
      SELECT a.*, u.owner_name as author_name,
        (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) as read_count
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.academy_id = ?
    `;
    const params = [academyId];

    if (filters.priority) {
      query += ' AND a.priority = ?';
      params.push(filters.priority);
    }

    if (filters.target_type) {
      query += ' AND a.target_type = ?';
      params.push(filters.target_type);
    }

    if (filters.search) {
      query += ' AND (a.title LIKE ? OR a.content LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // 발행된 공지만 (관리자가 아닌 경우)
    if (!filters.include_unpublished) {
      query += ' AND a.published_at IS NOT NULL AND a.published_at <= NOW()';
    }

    query += ' ORDER BY a.is_pinned DESC, a.published_at DESC, a.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 특정 공지사항 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 공지사항 ID
   * @returns {Promise<Object|null>} 공지사항 정보
   */
  static async findById(academyId, id) {
    const query = `
      SELECT a.*, u.owner_name as author_name,
        (SELECT COUNT(*) FROM announcement_reads ar WHERE ar.announcement_id = a.id) as read_count
      FROM announcements a
      LEFT JOIN users u ON a.author_id = u.id
      WHERE a.academy_id = ? AND a.id = ?
    `;
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0] || null;
  }

  /**
   * 공지사항 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} data - 공지사항 데이터
   * @returns {Promise<number>} 생성된 공지사항 ID
   */
  static async create(academyId, data) {
    const query = `
      INSERT INTO announcements (
        academy_id, author_id, title, content, priority,
        target_type, target_ids, is_pinned, published_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      academyId,
      data.author_id,
      data.title,
      data.content,
      data.priority || 'normal',
      data.target_type || 'all',
      data.target_ids ? JSON.stringify(data.target_ids) : null,
      data.is_pinned || false,
      data.published_at || null
    ]);
    return result.insertId;
  }

  /**
   * 공지사항 수정
   * @param {number} academyId - 학원 ID
   * @param {number} id - 공지사항 ID
   * @param {Object} data - 수정할 데이터
   * @returns {Promise<boolean>} 성공 여부
   */
  static async update(academyId, id, data) {
    const query = `
      UPDATE announcements
      SET title = ?, content = ?, priority = ?,
          target_type = ?, target_ids = ?, is_pinned = ?, published_at = ?
      WHERE academy_id = ? AND id = ?
    `;
    const [result] = await db.execute(query, [
      data.title,
      data.content,
      data.priority,
      data.target_type,
      data.target_ids ? JSON.stringify(data.target_ids) : null,
      data.is_pinned,
      data.published_at,
      academyId,
      id
    ]);
    return result.affectedRows > 0;
  }

  /**
   * 공지사항 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} id - 공지사항 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, id) {
    const query = 'DELETE FROM announcements WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 조회수 증가
   * @param {number} academyId - 학원 ID
   * @param {number} id - 공지사항 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async incrementViews(academyId, id) {
    const query = 'UPDATE announcements SET views = views + 1 WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 읽음 상태 기록
   * @param {number} announcementId - 공지사항 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async markAsRead(announcementId, userId) {
    const query = `
      INSERT INTO announcement_reads (announcement_id, user_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP
    `;
    const [result] = await db.execute(query, [announcementId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * 사용자별 읽음 여부 확인
   * @param {number} announcementId - 공지사항 ID
   * @param {number} userId - 사용자 ID
   * @returns {Promise<boolean>} 읽음 여부
   */
  static async isReadByUser(announcementId, userId) {
    const query = 'SELECT id FROM announcement_reads WHERE announcement_id = ? AND user_id = ?';
    const [rows] = await db.execute(query, [announcementId, userId]);
    return rows.length > 0;
  }

  /**
   * 공지사항 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<number>} 공지사항 개수
   */
  static async count(academyId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM announcements WHERE academy_id = ?';
    const params = [academyId];

    if (filters.priority) {
      query += ' AND priority = ?';
      params.push(filters.priority);
    }

    if (!filters.include_unpublished) {
      query += ' AND published_at IS NOT NULL AND published_at <= NOW()';
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  /**
   * 첨부파일 추가
   * @param {number} announcementId - 공지사항 ID
   * @param {Object} fileData - 파일 데이터
   * @returns {Promise<number>} 첨부파일 ID
   */
  static async addAttachment(announcementId, fileData) {
    const query = `
      INSERT INTO announcement_attachments (
        announcement_id, file_name, file_path, file_type, file_size
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      announcementId,
      fileData.file_name,
      fileData.file_path,
      fileData.file_type,
      fileData.file_size
    ]);
    return result.insertId;
  }

  /**
   * 공지사항의 모든 첨부파일 조회
   * @param {number} announcementId - 공지사항 ID
   * @returns {Promise<Array>} 첨부파일 목록
   */
  static async getAttachments(announcementId) {
    const query = 'SELECT * FROM announcement_attachments WHERE announcement_id = ?';
    const [rows] = await db.execute(query, [announcementId]);
    return rows;
  }

  /**
   * 첨부파일 삭제
   * @param {number} attachmentId - 첨부파일 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async deleteAttachment(attachmentId) {
    const query = 'DELETE FROM announcement_attachments WHERE id = ?';
    const [result] = await db.execute(query, [attachmentId]);
    return result.affectedRows > 0;
  }
}

module.exports = AnnouncementModel;
