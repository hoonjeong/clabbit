const db = require('../config/database');
const { validateSortColumn, validateSortOrder } = require('../utils/security');

/**
 * 강사 모델
 * 학원의 강사 정보 관리
 */
class TeacherModel {
  // 허용된 정렬 컬럼
  static ALLOWED_SORT_COLUMNS = ['id', 'name', 'phone', 'email', 'subject', 'hire_date', 'created_at', 'updated_at'];
  /**
   * 모든 강사 조회 (필터링 및 검색 지원)
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @param {string} filters.search - 검색어 (강사명, 이메일, 전화번호)
   * @param {string} filters.sortBy - 정렬 기준 (name/email/created_at)
   * @param {string} filters.sortOrder - 정렬 순서 (ASC/DESC)
   * @param {number} filters.limit - 페이지 크기
   * @param {number} filters.offset - 오프셋
   * @returns {Promise<Array>} 강사 목록
   */
  static async findAll(academyId, filters = {}) {
    let query = 'SELECT * FROM teachers WHERE academy_id = ?';
    const params = [academyId];

    // 검색 (강사명, 이메일, 전화번호)
    if (filters.search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 정렬 (SQL Injection 방지)
    const sortBy = validateSortColumn(filters.sortBy || 'created_at', TeacherModel.ALLOWED_SORT_COLUMNS);
    const sortOrder = validateSortOrder(filters.sortOrder);
    query += ` ORDER BY ${sortBy} ${sortOrder}`;

    // 페이지네이션
    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 강사 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<number>} 강사 개수
   */
  static async count(academyId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM teachers WHERE academy_id = ?';
    const params = [academyId];

    if (filters.search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  /**
   * 강사 상세 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 강사 ID
   * @returns {Promise<Object|null>} 강사 정보
   */
  static async findById(academyId, id) {
    const query = 'SELECT * FROM teachers WHERE academy_id = ? AND id = ?';
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0] || null;
  }

  /**
   * 강사 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} teacherData - 강사 데이터
   * @returns {Promise<number>} 생성된 강사 ID
   */
  static async create(academyId, teacherData) {
    const query = `
      INSERT INTO teachers
      (academy_id, name, phone, email, address, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const params = [
      academyId,
      teacherData.name,
      teacherData.phone,
      teacherData.email,
      teacherData.address || null,
      teacherData.notes || null
    ];

    const [result] = await db.execute(query, params);
    return result.insertId;
  }

  /**
   * 강사 수정
   * @param {number} academyId - 학원 ID
   * @param {number} id - 강사 ID
   * @param {Object} teacherData - 강사 데이터
   * @returns {Promise<boolean>} 성공 여부
   */
  static async update(academyId, id, teacherData) {
    const query = `
      UPDATE teachers
      SET name = ?, phone = ?, email = ?, address = ?, notes = ?
      WHERE academy_id = ? AND id = ?
    `;

    const params = [
      teacherData.name,
      teacherData.phone,
      teacherData.email,
      teacherData.address || null,
      teacherData.notes || null,
      academyId,
      id
    ];

    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  /**
   * 강사 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} id - 강사 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, id) {
    const query = 'DELETE FROM teachers WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 이메일 중복 확인
   * @param {number} academyId - 학원 ID
   * @param {string} email - 이메일
   * @param {number} excludeId - 제외할 강사 ID (수정 시)
   * @returns {Promise<boolean>} 중복 여부
   */
  static async isEmailExists(academyId, email, excludeId = null) {
    let query = 'SELECT COUNT(*) as count FROM teachers WHERE academy_id = ? AND email = ?';
    const params = [academyId, email];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count > 0;
  }
}

module.exports = TeacherModel;
