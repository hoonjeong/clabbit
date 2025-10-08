const db = require('../config/database');
const { validateSortColumn, validateSortOrder } = require('../utils/security');

/**
 * 수업 모델
 * 학원의 수업(클래스) 정보 관리
 */
class ClassModel {
  // 허용된 정렬 컬럼
  static ALLOWED_SORT_COLUMNS = ['id', 'class_name', 'teacher_id', 'day_of_week', 'class_time', 'capacity', 'fee', 'created_at', 'updated_at'];
  /**
   * 모든 수업 조회 (필터링 및 검색 지원)
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @param {string} filters.search - 검색어 (수업명, 강사명)
   * @param {string} filters.status - 상태 (active/completed)
   * @param {string} filters.grade - 학년
   * @param {string} filters.sortBy - 정렬 기준 (class_name/tuition/current_students/start_date)
   * @param {string} filters.sortOrder - 정렬 순서 (ASC/DESC)
   * @param {number} filters.limit - 페이지 크기
   * @param {number} filters.offset - 오프셋
   * @returns {Promise<Array>} 수업 목록 (current_students 포함)
   */
  static async findAll(academyId, filters = {}) {
    let query = `
      SELECT
        c.*,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as current_students
      FROM classes c
      LEFT JOIN enrollments e ON c.id = e.class_id
      WHERE c.academy_id = ?
    `;
    const params = [academyId];

    // 검색 (수업명, 강사명)
    if (filters.search) {
      query += ' AND (c.class_name LIKE ? OR c.teacher_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // 상태 필터
    if (filters.status) {
      query += ' AND c.status = ?';
      params.push(filters.status);
    }

    // 학년 필터
    if (filters.grade) {
      query += ' AND c.grade = ?';
      params.push(filters.grade);
    }

    // GROUP BY (enrollments를 JOIN했으므로 필요)
    query += ' GROUP BY c.id';

    // 정렬 (SQL Injection 방지)
    const sortBy = validateSortColumn(filters.sortBy || 'created_at', ClassModel.ALLOWED_SORT_COLUMNS);
    const sortOrder = validateSortOrder(filters.sortOrder);
    query += ` ORDER BY c.${sortBy} ${sortOrder}`;

    // 페이지네이션
    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 수업 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<number>} 수업 개수
   */
  static async count(academyId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM classes WHERE academy_id = ?';
    const params = [academyId];

    if (filters.search) {
      query += ' AND (class_name LIKE ? OR teacher_name LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.grade) {
      query += ' AND grade = ?';
      params.push(filters.grade);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  /**
   * 수업 상세 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 수업 ID
   * @returns {Promise<Object|null>} 수업 정보 (current_students 포함)
   */
  static async findById(academyId, id) {
    const query = `
      SELECT
        c.*,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as current_students
      FROM classes c
      LEFT JOIN enrollments e ON c.id = e.class_id
      WHERE c.academy_id = ? AND c.id = ?
      GROUP BY c.id
    `;
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0] || null;
  }

  /**
   * 수업 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} classData - 수업 데이터
   * @returns {Promise<number>} 생성된 수업 ID
   */
  static async create(academyId, classData) {
    const query = `
      INSERT INTO classes
      (academy_id, class_name, tuition, schedule, schedule_day, schedule_hour, schedule_minute,
       teacher_id, teacher_name, grade, capacity, description, payment_cycle, payment_week_interval,
       start_date, end_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      academyId,
      classData.class_name,
      classData.tuition || 0,
      classData.schedule || null,
      classData.schedule_day || null,
      classData.schedule_hour || null,
      classData.schedule_minute || null,
      classData.teacher_id || null,
      classData.teacher_name || null,
      classData.grade || null,
      classData.capacity || null,
      classData.description || null,
      classData.payment_cycle || 'monthly',
      classData.payment_week_interval || null,
      classData.start_date,
      classData.end_date || null,
      classData.status || 'active'
    ];

    const [result] = await db.execute(query, params);
    return result.insertId;
  }

  /**
   * 수업 수정
   * @param {number} academyId - 학원 ID
   * @param {number} id - 수업 ID
   * @param {Object} classData - 수업 데이터
   * @returns {Promise<boolean>} 성공 여부
   */
  static async update(academyId, id, classData) {
    const query = `
      UPDATE classes
      SET class_name = ?, tuition = ?, schedule = ?, schedule_day = ?, schedule_hour = ?, schedule_minute = ?,
          teacher_id = ?, teacher_name = ?, grade = ?, capacity = ?, description = ?,
          payment_cycle = ?, payment_week_interval = ?, start_date = ?, end_date = ?, status = ?
      WHERE academy_id = ? AND id = ?
    `;

    const params = [
      classData.class_name,
      classData.tuition,
      classData.schedule || null,
      classData.schedule_day || null,
      classData.schedule_hour || null,
      classData.schedule_minute || null,
      classData.teacher_id || null,
      classData.teacher_name || null,
      classData.grade || null,
      classData.capacity || null,
      classData.description || null,
      classData.payment_cycle || 'monthly',
      classData.payment_week_interval || null,
      classData.start_date,
      classData.end_date || null,
      classData.status || 'active',
      academyId,
      id
    ];

    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  /**
   * 수업 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} id - 수업 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, id) {
    const query = 'DELETE FROM classes WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 수업 종강 처리
   * @param {number} academyId - 학원 ID
   * @param {number} id - 수업 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async complete(academyId, id) {
    const query = `
      UPDATE classes
      SET status = 'completed', end_date = CURDATE()
      WHERE academy_id = ? AND id = ?
    `;
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 현재 학생 수 업데이트
   * @param {number} academyId - 학원 ID
   * @param {number} id - 수업 ID
   * @param {number} count - 학생 수
   * @returns {Promise<boolean>} 성공 여부
   */
  static async updateStudentCount(academyId, id, count) {
    const query = `
      UPDATE classes
      SET current_students = ?
      WHERE academy_id = ? AND id = ?
    `;
    const [result] = await db.execute(query, [count, academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 학년 목록 조회
   * @param {number} academyId - 학원 ID
   * @returns {Promise<Array>} 학년 목록
   */
  static async getGrades(academyId) {
    const query = 'SELECT DISTINCT grade FROM classes WHERE academy_id = ? AND grade IS NOT NULL ORDER BY grade';
    const [rows] = await db.execute(query, [academyId]);
    return rows.map(row => row.grade);
  }
}

module.exports = ClassModel;
