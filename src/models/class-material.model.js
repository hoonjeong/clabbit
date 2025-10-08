const db = require('../config/database');

/**
 * 수업 자료 데이터 모델
 * 학원별로 격리된 수업 자료 관리
 */
class ClassMaterialModel {
  /**
   * 수업 자료 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} data - 자료 데이터
   * @returns {Promise<number>} 생성된 자료 ID
   */
  static async create(academyId, data) {
    const query = `
      INSERT INTO class_materials (
        academy_id, schedule_id, teacher_id, title, description,
        material_type, file_path, file_name, file_size,
        external_link, is_public
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      academyId,
      data.schedule_id || null,
      data.teacher_id,
      data.title,
      data.description || null,
      data.material_type,
      data.file_path || null,
      data.file_name || null,
      data.file_size || null,
      data.external_link || null,
      data.is_public !== undefined ? data.is_public : true
    ]);
    return result.insertId;
  }

  /**
   * 수업 자료 목록 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 자료 목록
   */
  static async findAll(academyId, filters = {}) {
    let query = `
      SELECT cm.*,
        t.name as teacher_name,
        cs.title as schedule_title
      FROM class_materials cm
      LEFT JOIN teachers t ON cm.teacher_id = t.id
      LEFT JOIN class_schedules cs ON cm.schedule_id = cs.id
      WHERE cm.academy_id = ?
    `;
    const params = [academyId];

    if (filters.schedule_id) {
      query += ' AND cm.schedule_id = ?';
      params.push(filters.schedule_id);
    }

    if (filters.teacher_id) {
      query += ' AND cm.teacher_id = ?';
      params.push(filters.teacher_id);
    }

    if (filters.material_type) {
      query += ' AND cm.material_type = ?';
      params.push(filters.material_type);
    }

    if (filters.is_public !== undefined) {
      query += ' AND cm.is_public = ?';
      params.push(filters.is_public);
    }

    if (filters.search) {
      query += ' AND (cm.title LIKE ? OR cm.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY cm.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 특정 자료 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 자료 ID
   * @returns {Promise<Object|null>} 자료 정보
   */
  static async findById(academyId, id) {
    const query = `
      SELECT cm.*,
        t.name as teacher_name,
        cs.title as schedule_title
      FROM class_materials cm
      LEFT JOIN teachers t ON cm.teacher_id = t.id
      LEFT JOIN class_schedules cs ON cm.schedule_id = cs.id
      WHERE cm.academy_id = ? AND cm.id = ?
    `;
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0] || null;
  }

  /**
   * 수업 자료 수정
   * @param {number} academyId - 학원 ID
   * @param {number} id - 자료 ID
   * @param {Object} data - 수정할 데이터
   * @returns {Promise<boolean>} 성공 여부
   */
  static async update(academyId, id, data) {
    const query = `
      UPDATE class_materials
      SET title = ?, description = ?, is_public = ?
      WHERE academy_id = ? AND id = ?
    `;
    const [result] = await db.execute(query, [
      data.title,
      data.description,
      data.is_public,
      academyId,
      id
    ]);
    return result.affectedRows > 0;
  }

  /**
   * 수업 자료 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} id - 자료 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, id) {
    const query = 'DELETE FROM class_materials WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 다운로드 수 증가
   * @param {number} academyId - 학원 ID
   * @param {number} id - 자료 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async incrementDownloadCount(academyId, id) {
    const query = 'UPDATE class_materials SET download_count = download_count + 1 WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 자료 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<number>} 자료 개수
   */
  static async count(academyId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM class_materials WHERE academy_id = ?';
    const params = [academyId];

    if (filters.schedule_id) {
      query += ' AND schedule_id = ?';
      params.push(filters.schedule_id);
    }

    if (filters.material_type) {
      query += ' AND material_type = ?';
      params.push(filters.material_type);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }
}

module.exports = ClassMaterialModel;
