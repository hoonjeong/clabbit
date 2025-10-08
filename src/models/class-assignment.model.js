const db = require('../config/database');

/**
 * 수업 과제 데이터 모델
 * 학원별로 격리된 과제 관리
 */
class ClassAssignmentModel {
  /**
   * 과제 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} data - 과제 데이터
   * @returns {Promise<number>} 생성된 과제 ID
   */
  static async create(academyId, data) {
    const query = `
      INSERT INTO class_assignments (
        academy_id, schedule_id, teacher_id, title, description,
        due_date, max_score, is_required, allow_late_submission
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      academyId,
      data.schedule_id || null,
      data.teacher_id,
      data.title,
      data.description,
      data.due_date || null,
      data.max_score || null,
      data.is_required !== undefined ? data.is_required : true,
      data.allow_late_submission || false
    ]);
    return result.insertId;
  }

  /**
   * 과제 목록 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 과제 목록
   */
  static async findAll(academyId, filters = {}) {
    let query = `
      SELECT ca.*,
        t.name as teacher_name,
        cs.title as schedule_title,
        (SELECT COUNT(*) FROM assignment_submissions asub
         WHERE asub.assignment_id = ca.id) as submission_count
      FROM class_assignments ca
      LEFT JOIN teachers t ON ca.teacher_id = t.id
      LEFT JOIN class_schedules cs ON ca.schedule_id = cs.id
      WHERE ca.academy_id = ?
    `;
    const params = [academyId];

    if (filters.schedule_id) {
      query += ' AND ca.schedule_id = ?';
      params.push(filters.schedule_id);
    }

    if (filters.teacher_id) {
      query += ' AND ca.teacher_id = ?';
      params.push(filters.teacher_id);
    }

    if (filters.search) {
      query += ' AND (ca.title LIKE ? OR ca.description LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY ca.due_date DESC, ca.created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 특정 과제 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 과제 ID
   * @returns {Promise<Object|null>} 과제 정보
   */
  static async findById(academyId, id) {
    const query = `
      SELECT ca.*,
        t.name as teacher_name,
        cs.title as schedule_title,
        (SELECT COUNT(*) FROM assignment_submissions asub
         WHERE asub.assignment_id = ca.id) as submission_count
      FROM class_assignments ca
      LEFT JOIN teachers t ON ca.teacher_id = t.id
      LEFT JOIN class_schedules cs ON ca.schedule_id = cs.id
      WHERE ca.academy_id = ? AND ca.id = ?
    `;
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0] || null;
  }

  /**
   * 과제 수정
   * @param {number} academyId - 학원 ID
   * @param {number} id - 과제 ID
   * @param {Object} data - 수정할 데이터
   * @returns {Promise<boolean>} 성공 여부
   */
  static async update(academyId, id, data) {
    const query = `
      UPDATE class_assignments
      SET title = ?, description = ?, due_date = ?,
          max_score = ?, is_required = ?, allow_late_submission = ?
      WHERE academy_id = ? AND id = ?
    `;
    const [result] = await db.execute(query, [
      data.title,
      data.description,
      data.due_date,
      data.max_score,
      data.is_required,
      data.allow_late_submission,
      academyId,
      id
    ]);
    return result.affectedRows > 0;
  }

  /**
   * 과제 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} id - 과제 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, id) {
    const query = 'DELETE FROM class_assignments WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 과제 제출
   * @param {number} assignmentId - 과제 ID
   * @param {number} studentId - 학생 ID
   * @param {Object} data - 제출 데이터
   * @returns {Promise<number>} 제출 ID
   */
  static async submitAssignment(assignmentId, studentId, data) {
    // 마감일 확인
    const assignment = await db.execute(
      'SELECT due_date, allow_late_submission FROM class_assignments WHERE id = ?',
      [assignmentId]
    );

    let status = 'submitted';
    if (assignment[0][0] && assignment[0][0].due_date) {
      const dueDate = new Date(assignment[0][0].due_date);
      const now = new Date();
      if (now > dueDate) {
        status = 'late';
      }
    }

    const query = `
      INSERT INTO assignment_submissions (
        assignment_id, student_id, content, submission_status
      ) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        content = VALUES(content),
        submission_status = VALUES(submission_status),
        submitted_at = CURRENT_TIMESTAMP
    `;
    const [result] = await db.execute(query, [
      assignmentId,
      studentId,
      data.content || null,
      status
    ]);
    return result.insertId || result.affectedRows;
  }

  /**
   * 과제 채점
   * @param {number} submissionId - 제출 ID
   * @param {number} teacherId - 채점자 ID
   * @param {number} score - 점수
   * @param {string} feedback - 피드백
   * @returns {Promise<boolean>} 성공 여부
   */
  static async gradeSubmission(submissionId, teacherId, score, feedback = null) {
    const query = `
      UPDATE assignment_submissions
      SET score = ?, feedback = ?, graded_by = ?,
          graded_at = CURRENT_TIMESTAMP, submission_status = 'graded'
      WHERE id = ?
    `;
    const [result] = await db.execute(query, [score, feedback, teacherId, submissionId]);
    return result.affectedRows > 0;
  }

  /**
   * 과제 제출 목록 조회
   * @param {number} assignmentId - 과제 ID
   * @returns {Promise<Array>} 제출 목록
   */
  static async getSubmissions(assignmentId) {
    const query = `
      SELECT asub.*,
        s.name as student_name,
        t.name as grader_name
      FROM assignment_submissions asub
      JOIN students s ON asub.student_id = s.id
      LEFT JOIN teachers t ON asub.graded_by = t.id
      WHERE asub.assignment_id = ?
      ORDER BY asub.submitted_at DESC
    `;
    const [rows] = await db.execute(query, [assignmentId]);
    return rows;
  }

  /**
   * 학생의 과제 제출 조회
   * @param {number} assignmentId - 과제 ID
   * @param {number} studentId - 학생 ID
   * @returns {Promise<Object|null>} 제출 정보
   */
  static async getSubmissionByStudent(assignmentId, studentId) {
    const query = `
      SELECT asub.*,
        t.name as grader_name
      FROM assignment_submissions asub
      LEFT JOIN teachers t ON asub.graded_by = t.id
      WHERE asub.assignment_id = ? AND asub.student_id = ?
    `;
    const [rows] = await db.execute(query, [assignmentId, studentId]);
    return rows[0] || null;
  }

  /**
   * 제출 첨부파일 추가
   * @param {number} submissionId - 제출 ID
   * @param {Object} fileData - 파일 데이터
   * @returns {Promise<number>} 첨부파일 ID
   */
  static async addSubmissionFile(submissionId, fileData) {
    const query = `
      INSERT INTO assignment_submission_files (
        submission_id, file_name, file_path, file_type, file_size
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      submissionId,
      fileData.file_name,
      fileData.file_path,
      fileData.file_type,
      fileData.file_size
    ]);
    return result.insertId;
  }

  /**
   * 제출 첨부파일 조회
   * @param {number} submissionId - 제출 ID
   * @returns {Promise<Array>} 첨부파일 목록
   */
  static async getSubmissionFiles(submissionId) {
    const query = 'SELECT * FROM assignment_submission_files WHERE submission_id = ?';
    const [rows] = await db.execute(query, [submissionId]);
    return rows;
  }

  /**
   * 과제 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<number>} 과제 개수
   */
  static async count(academyId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM class_assignments WHERE academy_id = ?';
    const params = [academyId];

    if (filters.schedule_id) {
      query += ' AND schedule_id = ?';
      params.push(filters.schedule_id);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  /**
   * 미제출 과제 목록 조회 (학생용)
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @returns {Promise<Array>} 미제출 과제 목록
   */
  static async getPendingAssignments(academyId, studentId) {
    const query = `
      SELECT ca.*,
        cs.title as schedule_title,
        t.name as teacher_name
      FROM class_assignments ca
      LEFT JOIN class_schedules cs ON ca.schedule_id = cs.id
      LEFT JOIN teachers t ON ca.teacher_id = t.id
      WHERE ca.academy_id = ?
      AND ca.id NOT IN (
        SELECT assignment_id FROM assignment_submissions WHERE student_id = ?
      )
      AND (ca.due_date IS NULL OR ca.due_date >= NOW())
      ORDER BY ca.due_date ASC
    `;
    const [rows] = await db.execute(query, [academyId, studentId]);
    return rows;
  }
}

module.exports = ClassAssignmentModel;
