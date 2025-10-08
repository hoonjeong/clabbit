const db = require('../config/database');

/**
 * 학생 데이터 모델
 * 학원별로 격리된 학생 정보 관리
 */
class StudentModel {
  /**
   * 모든 학생 조회 (필터링 및 검색 지원)
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @param {string} [filters.status] - 학생 상태 (active/withdrawn)
   * @param {string} [filters.search] - 검색어 (이름, 학생전화번호, 학부모전화번호)
   * @param {string} [filters.enrollment_month] - 신규 월 필터 (YYYY-MM 형식)
   * @param {string} [filters.withdrawal_month] - 퇴원 월 필터 (YYYY-MM 형식)
   * @param {number} [filters.limit] - 페이지당 개수
   * @param {number} [filters.offset] - 시작 위치
   * @returns {Promise<Array>} 학생 목록
   */
  static async findAll(academyId, filters = {}) {
    let query = 'SELECT * FROM students WHERE academy_id = ?';
    const params = [academyId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR student_phone LIKE ? OR parent_phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 신규 월 필터
    if (filters.enrollment_month) {
      query += ' AND DATE_FORMAT(enrollment_date, "%Y-%m") = ?';
      params.push(filters.enrollment_month);
    }

    // 퇴원 월 필터
    if (filters.withdrawal_month) {
      query += ' AND DATE_FORMAT(withdrawal_date, "%Y-%m") = ?';
      params.push(filters.withdrawal_month);
    }

    query += ' ORDER BY enrollment_date DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * ID로 학생 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 학생 ID
   * @returns {Promise<Object|undefined>} 학생 정보 또는 undefined
   */
  static async findById(academyId, id) {
    const query = 'SELECT * FROM students WHERE academy_id = ? AND id = ?';
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0];
  }

  /**
   * 학생 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} studentData - 학생 정보
   * @param {string} studentData.name - 이름
   * @param {string} studentData.birth_date - 생년월일 (YYYY-MM-DD)
   * @param {string} studentData.parent_phone - 학부모 전화번호
   * @param {string} [studentData.school] - 학교
   * @param {string} [studentData.grade] - 학년
   * @param {string} [studentData.student_phone] - 학생 전화번호
   * @param {string} [studentData.address] - 주소
   * @param {string} [studentData.memo] - 메모
   * @param {string} [studentData.enrollment_date] - 입학일 (기본: 오늘)
   * @returns {Promise<number>} 생성된 학생 ID
   */
  static async create(academyId, studentData) {
    const query = `
      INSERT INTO students
      (academy_id, name, birth_date, school, grade, student_phone, parent_phone,
       address, memo, enrollment_date, enrollment_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `;

    const [result] = await db.execute(query, [
      academyId,
      studentData.name,
      studentData.birth_date,
      studentData.school || null,
      studentData.grade || null,
      studentData.student_phone || null,
      studentData.parent_phone,
      studentData.address || null,
      studentData.memo || null,
      studentData.enrollment_date || new Date().toISOString().split('T')[0],
      studentData.enrollment_type || 'new'  // 신규/재원 구분
    ]);

    return result.insertId;
  }

  /**
   * 학생 정보 수정
   * @param {number} academyId - 학원 ID
   * @param {number} id - 학생 ID
   * @param {Object} studentData - 수정할 학생 정보
   * @returns {Promise<number>} 수정된 행 수
   */
  static async update(academyId, id, studentData) {
    const query = `
      UPDATE students
      SET name = ?, birth_date = ?, school = ?, grade = ?,
          student_phone = ?, parent_phone = ?, address = ?, memo = ?,
          enrollment_type = ?
      WHERE academy_id = ? AND id = ?
    `;

    const [result] = await db.execute(query, [
      studentData.name,
      studentData.birth_date,
      studentData.school || null,
      studentData.grade || null,
      studentData.student_phone || null,
      studentData.parent_phone,
      studentData.address || null,
      studentData.memo || null,
      studentData.enrollment_type || 'new',  // 신규/재원 구분
      academyId,
      id
    ]);

    return result.affectedRows;
  }

  /**
   * 퇴원 처리
   * @param {number} academyId - 학원 ID
   * @param {number} id - 학생 ID
   * @returns {Promise<number>} 수정된 행 수 (0이면 학생을 찾을 수 없거나 이미 퇴원)
   */
  static async withdraw(academyId, id) {
    const withdrawalDate = new Date().toISOString().split('T')[0];
    const query = `
      UPDATE students
      SET status = 'withdrawn',
          withdrawal_date = ?
      WHERE academy_id = ? AND id = ? AND status = 'active'
    `;

    const [result] = await db.execute(query, [withdrawalDate, academyId, id]);
    return result.affectedRows;
  }

  /**
   * 재원 처리
   * @param {number} academyId - 학원 ID
   * @param {number} id - 학생 ID
   * @returns {Promise<number>} 수정된 행 수 (0이면 학생을 찾을 수 없거나 이미 재원중)
   */
  static async reinstate(academyId, id) {
    const newEnrollmentDate = new Date().toISOString().split('T')[0];
    const query = `
      UPDATE students
      SET status = 'active',
          withdrawal_date = NULL,
          enrollment_date = ?
      WHERE academy_id = ? AND id = ? AND status = 'withdrawn'
    `;

    const [result] = await db.execute(query, [newEnrollmentDate, academyId, id]);
    return result.affectedRows;
  }

  /**
   * 일괄 등록
   * @param {number} academyId - 학원 ID
   * @param {Array<Object>} studentsArray - 학생 정보 배열
   * @returns {Promise<number>} 등록된 학생 수
   */
  static async bulkCreate(academyId, studentsArray) {
    const query = `
      INSERT INTO students
      (academy_id, name, birth_date, school, grade, student_phone, parent_phone,
       address, memo, enrollment_date, status)
      VALUES ?
    `;

    const values = studentsArray.map(s => [
      academyId,
      s.name,
      s.birth_date,
      s.school || null,
      s.grade || null,
      s.student_phone || null,
      s.parent_phone,
      s.address || null,
      s.memo || null,
      s.enrollment_date || new Date().toISOString().split('T')[0],
      'active'
    ]);

    const [result] = await db.query(query, [values]);
    return result.affectedRows;
  }

  /**
   * 학부모 전화번호로 학생 찾기 (중복 체크용)
   * @param {number} academyId - 학원 ID
   * @param {string} parentPhone - 학부모 전화번호
   * @param {number} [excludeId] - 제외할 학생 ID (수정 시)
   * @returns {Promise<Object|undefined>} 학생 정보 또는 undefined
   */
  static async findByParentPhone(academyId, parentPhone, excludeId = null) {
    let query = 'SELECT * FROM students WHERE academy_id = ? AND parent_phone = ? AND status = ?';
    const params = [academyId, parentPhone, 'active'];

    if (excludeId) {
      query += ' AND id != ?';
      params.push(excludeId);
    }

    const [rows] = await db.execute(query, params);
    return rows[0];
  }

  /**
   * 전체 학생 수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @param {string} [filters.status] - 학생 상태
   * @param {string} [filters.search] - 검색어
   * @returns {Promise<number>} 학생 수
   */
  static async count(academyId, filters = {}) {
    let query = 'SELECT COUNT(*) as total FROM students WHERE academy_id = ?';
    const params = [academyId];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.search) {
      query += ' AND (name LIKE ? OR student_phone LIKE ? OR parent_phone LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // 신규 월 필터
    if (filters.enrollment_month) {
      query += ' AND DATE_FORMAT(enrollment_date, "%Y-%m") = ?';
      params.push(filters.enrollment_month);
    }

    // 퇴원 월 필터
    if (filters.withdrawal_month) {
      query += ' AND DATE_FORMAT(withdrawal_date, "%Y-%m") = ?';
      params.push(filters.withdrawal_month);
    }

    const [[{ total }]] = await db.execute(query, params);
    return total;
  }

  /**
   * ID 배열로 학생 조회
   * @param {number} academyId - 학원 ID
   * @param {Array<number>} studentIds - 학생 ID 배열
   * @returns {Promise<Array>} 학생 목록
   */
  static async findByIds(academyId, studentIds) {
    if (!studentIds || studentIds.length === 0) {
      return [];
    }

    const placeholders = studentIds.map(() => '?').join(',');
    const query = `
      SELECT * FROM students
      WHERE academy_id = ? AND id IN (${placeholders})
      ORDER BY enrollment_date DESC
    `;

    const [rows] = await db.execute(query, [academyId, ...studentIds]);
    return rows;
  }

  /**
   * 활성 학생 수 조회
   * @param {number} academyId - 학원 ID
   * @param {number} [classId] - 반 ID (선택)
   * @returns {Promise<number>} 활성 학생 수
   */
  static async countActive(academyId, classId = null) {
    let query = 'SELECT COUNT(*) as total FROM students WHERE academy_id = ? AND status = ?';
    const params = [academyId, 'active'];

    if (classId) {
      query += ' AND class_id = ?';
      params.push(classId);
    }

    const [[{ total }]] = await db.execute(query, params);
    return total;
  }
}

module.exports = StudentModel;
