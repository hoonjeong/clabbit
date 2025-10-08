const db = require('../config/database');

/**
 * 수강 등록 모델
 * 학생과 수업을 연결하는 등록 정보 관리
 */
class EnrollmentModel {
  /**
   * 수강 등록 생성 (단일)
   * @param {number} academyId - 학원 ID
   * @param {Object} enrollmentData - 등록 데이터
   * @returns {Promise<number>} 생성된 등록 ID
   */
  static async create(academyId, enrollmentData) {
    // 학생과 수업이 같은 학원에 속하는지 확인
    const checkQuery = `
      SELECT s.id as student_id, c.id as class_id
      FROM students s, classes c
      WHERE s.id = ? AND s.academy_id = ?
        AND c.id = ? AND c.academy_id = ?
    `;
    const [checkRows] = await db.execute(checkQuery, [
      enrollmentData.student_id,
      academyId,
      enrollmentData.class_id,
      academyId
    ]);

    if (checkRows.length === 0) {
      throw new Error('학생 또는 수업을 찾을 수 없습니다.');
    }

    // 중복 등록 확인
    const duplicateQuery = `
      SELECT id FROM enrollments
      WHERE student_id = ? AND class_id = ? AND status = 'active'
    `;
    const [duplicateRows] = await db.execute(duplicateQuery, [
      enrollmentData.student_id,
      enrollmentData.class_id
    ]);

    if (duplicateRows.length > 0) {
      throw new Error('이미 해당 수업에 등록된 학생입니다.');
    }

    // 등록 생성
    const insertQuery = `
      INSERT INTO enrollments
      (student_id, class_id, start_date, first_month_fee, status)
      VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(insertQuery, [
      enrollmentData.student_id,
      enrollmentData.class_id,
      enrollmentData.start_date,
      enrollmentData.first_month_fee || 0,
      'active'
    ]);

    return result.insertId;
  }

  /**
   * 수강 등록 생성 (일괄)
   * @param {number} academyId - 학원 ID
   * @param {Array<number>} studentIds - 학생 ID 배열
   * @param {Object} enrollmentData - 공통 등록 데이터
   * @returns {Promise<Array>} 생성된 등록 ID 배열
   */
  static async bulkCreate(academyId, studentIds, enrollmentData) {
    const connection = await db.getConnection();
    const results = [];

    try {
      await connection.beginTransaction();

      // 수업이 해당 학원에 속하는지 확인
      const [classRows] = await connection.execute(
        'SELECT id FROM classes WHERE id = ? AND academy_id = ?',
        [enrollmentData.class_id, academyId]
      );

      if (classRows.length === 0) {
        throw new Error('수업을 찾을 수 없습니다.');
      }

      // 각 학생에 대해 등록 처리
      for (const studentId of studentIds) {
        // 학생이 해당 학원에 속하는지 확인
        const [studentRows] = await connection.execute(
          'SELECT id FROM students WHERE id = ? AND academy_id = ?',
          [studentId, academyId]
        );

        if (studentRows.length === 0) {
          throw new Error(`학생 ID ${studentId}를 찾을 수 없습니다.`);
        }

        // 중복 등록 확인
        const [duplicateRows] = await connection.execute(
          'SELECT id FROM enrollments WHERE student_id = ? AND class_id = ? AND status = "active"',
          [studentId, enrollmentData.class_id]
        );

        if (duplicateRows.length > 0) {
          throw new Error(`학생 ID ${studentId}는 이미 해당 수업에 등록되어 있습니다.`);
        }

        // 등록 생성
        const [result] = await connection.execute(
          `INSERT INTO enrollments
           (student_id, class_id, start_date, first_month_fee, status)
           VALUES (?, ?, ?, ?, ?)`,
          [
            studentId,
            enrollmentData.class_id,
            enrollmentData.start_date,
            enrollmentData.first_month_fee || 0,
            'active'
          ]
        );

        results.push(result.insertId);
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 특정 학생의 수강 내역 조회
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 수강 내역 목록
   */
  static async findByStudent(academyId, studentId, filters = {}) {
    let query = `
      SELECT e.*, c.class_name, c.teacher_name, c.schedule
      FROM enrollments e
      JOIN classes c ON e.class_id = c.id
      JOIN students s ON e.student_id = s.id
      WHERE s.id = ? AND s.academy_id = ? AND c.academy_id = ?
    `;
    const params = [studentId, academyId, academyId];

    if (filters.status) {
      query += ' AND e.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY e.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 특정 수업의 수강생 목록 조회
   * @param {number} academyId - 학원 ID
   * @param {number} classId - 수업 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 수강생 목록
   */
  static async findByClass(academyId, classId, filters = {}) {
    let query = `
      SELECT e.*, s.name as student_name, s.grade, s.phone, s.status as student_status
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN classes c ON e.class_id = c.id
      WHERE c.id = ? AND c.academy_id = ? AND s.academy_id = ?
    `;
    const params = [classId, academyId, academyId];

    if (filters.status) {
      query += ' AND e.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY e.created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 특정 수업에 등록되지 않은 학생 목록 조회
   * @param {number} academyId - 학원 ID
   * @param {number} classId - 수업 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 등록 가능한 학생 목록
   */
  static async findAvailableStudents(academyId, classId, filters = {}) {
    let query = `
      SELECT s.*
      FROM students s
      WHERE s.academy_id = ?
        AND s.id NOT IN (
          SELECT e.student_id
          FROM enrollments e
          WHERE e.class_id = ? AND e.status = 'active'
        )
    `;
    const params = [academyId, classId];

    // 재학중인 학생만 (기본값)
    if (filters.studentStatus !== 'all') {
      query += ' AND s.status = ?';
      params.push(filters.studentStatus || 'active');
    }

    if (filters.grade) {
      query += ' AND s.grade = ?';
      params.push(filters.grade);
    }

    if (filters.search) {
      query += ' AND s.name LIKE ?';
      params.push(`%${filters.search}%`);
    }

    query += ' ORDER BY s.name ASC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 수강 등록 상태 변경
   * @param {number} academyId - 학원 ID
   * @param {number} enrollmentId - 등록 ID
   * @param {string} status - 변경할 상태
   * @returns {Promise<boolean>} 성공 여부
   */
  static async updateStatus(academyId, enrollmentId, status) {
    const query = `
      UPDATE enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN classes c ON e.class_id = c.id
      SET e.status = ?
      WHERE e.id = ? AND s.academy_id = ? AND c.academy_id = ?
    `;

    const [result] = await db.execute(query, [status, enrollmentId, academyId, academyId]);
    return result.affectedRows > 0;
  }

  /**
   * 특정 학생의 모든 active 수강 등록을 withdrawn으로 변경
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @returns {Promise<number>} 변경된 행 수
   */
  static async withdrawAllByStudent(academyId, studentId) {
    const query = `
      UPDATE enrollments e
      JOIN students s ON e.student_id = s.id
      SET e.status = 'withdrawn'
      WHERE e.student_id = ? AND s.academy_id = ? AND e.status = 'active'
    `;

    const [result] = await db.execute(query, [studentId, academyId]);
    return result.affectedRows;
  }

  /**
   * 등록 상세 조회
   * @param {number} academyId - 학원 ID
   * @param {number} enrollmentId - 등록 ID
   * @returns {Promise<Object|null>} 등록 정보
   */
  static async findById(academyId, enrollmentId) {
    const query = `
      SELECT e.*, s.name as student_name, c.class_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = ? AND s.academy_id = ? AND c.academy_id = ?
    `;

    const [rows] = await db.execute(query, [enrollmentId, academyId, academyId]);
    return rows[0] || null;
  }

  /**
   * 등록 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} enrollmentId - 등록 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, enrollmentId) {
    const query = `
      DELETE e FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN classes c ON e.class_id = c.id
      WHERE e.id = ? AND s.academy_id = ? AND c.academy_id = ?
    `;

    const [result] = await db.execute(query, [enrollmentId, academyId, academyId]);
    return result.affectedRows > 0;
  }

  /**
   * 수업별 수강생 명단 조회 (상세)
   * @param {number} academyId - 학원 ID
   * @param {number} classId - 수업 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 수강생 목록
   */
  static async findClassStudentsDetailed(academyId, classId, filters = {}) {
    let query = `
      SELECT
        e.id as enrollment_id,
        e.student_id,
        e.start_date,
        e.first_month_fee,
        e.status,
        e.created_at,
        s.name as student_name,
        s.grade,
        s.student_phone,
        s.parent_phone
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN classes c ON e.class_id = c.id
      WHERE c.id = ? AND c.academy_id = ? AND s.academy_id = ?
    `;
    const params = [classId, academyId, academyId];

    // 상태 필터
    if (filters.status) {
      query += ' AND e.status = ?';
      params.push(filters.status);
    }

    // 정렬: active가 먼저, 그 다음 시작일 최신순
    query += ' ORDER BY FIELD(e.status, "active", "completed", "withdrawn"), e.start_date DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 종강 처리 (enrollment status를 completed로 변경)
   * @param {number} academyId - 학원 ID
   * @param {number} enrollmentId - 등록 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async completeEnrollment(academyId, enrollmentId) {
    const query = `
      UPDATE enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN classes c ON e.class_id = c.id
      SET e.status = 'completed'
      WHERE e.id = ? AND s.academy_id = ? AND c.academy_id = ? AND e.status = 'active'
    `;

    const [result] = await db.execute(query, [enrollmentId, academyId, academyId]);
    return result.affectedRows > 0;
  }
}

module.exports = EnrollmentModel;
