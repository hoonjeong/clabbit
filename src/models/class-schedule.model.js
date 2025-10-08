const db = require('../config/database');

/**
 * 수업 일정 데이터 모델
 * 학원별로 격리된 수업 일정 관리
 */
class ClassScheduleModel {
  /**
   * 수업 일정 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} data - 수업 일정 데이터
   * @returns {Promise<number>} 생성된 일정 ID
   */
  static async create(academyId, data) {
    const query = `
      INSERT INTO class_schedules (
        academy_id, class_id, teacher_id, subject, title, description,
        schedule_date, start_time, end_time, room, max_students,
        is_recurring, recurring_pattern
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.execute(query, [
      academyId,
      data.class_id || null,
      data.teacher_id || null,
      data.subject,
      data.title,
      data.description || null,
      data.schedule_date,
      data.start_time,
      data.end_time,
      data.room || null,
      data.max_students || null,
      data.is_recurring || false,
      data.recurring_pattern ? JSON.stringify(data.recurring_pattern) : null
    ]);
    return result.insertId;
  }

  /**
   * 수업 일정 목록 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 수업 일정 목록
   */
  static async findAll(academyId, filters = {}) {
    let query = `
      SELECT cs.*,
        c.name as class_name,
        t.name as teacher_name,
        (SELECT COUNT(*) FROM class_schedule_students css
         WHERE css.schedule_id = cs.id) as enrolled_count
      FROM class_schedules cs
      LEFT JOIN classes c ON cs.class_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.academy_id = ?
    `;
    const params = [academyId];

    if (filters.class_id) {
      query += ' AND cs.class_id = ?';
      params.push(filters.class_id);
    }

    if (filters.teacher_id) {
      query += ' AND cs.teacher_id = ?';
      params.push(filters.teacher_id);
    }

    if (filters.status) {
      query += ' AND cs.status = ?';
      params.push(filters.status);
    }

    if (filters.start_date) {
      query += ' AND cs.schedule_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND cs.schedule_date <= ?';
      params.push(filters.end_date);
    }

    if (filters.search) {
      query += ' AND (cs.title LIKE ? OR cs.subject LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY cs.schedule_date DESC, cs.start_time ASC';

    if (filters.limit) {
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(filters.offset || 0));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 특정 수업 일정 조회
   * @param {number} academyId - 학원 ID
   * @param {number} id - 일정 ID
   * @returns {Promise<Object|null>} 수업 일정 정보
   */
  static async findById(academyId, id) {
    const query = `
      SELECT cs.*,
        c.name as class_name,
        t.name as teacher_name,
        (SELECT COUNT(*) FROM class_schedule_students css
         WHERE css.schedule_id = cs.id) as enrolled_count
      FROM class_schedules cs
      LEFT JOIN classes c ON cs.class_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.academy_id = ? AND cs.id = ?
    `;
    const [rows] = await db.execute(query, [academyId, id]);
    return rows[0] || null;
  }

  /**
   * 수업 일정 수정
   * @param {number} academyId - 학원 ID
   * @param {number} id - 일정 ID
   * @param {Object} data - 수정할 데이터
   * @returns {Promise<boolean>} 성공 여부
   */
  static async update(academyId, id, data) {
    const query = `
      UPDATE class_schedules
      SET class_id = ?, teacher_id = ?, subject = ?, title = ?,
          description = ?, schedule_date = ?, start_time = ?, end_time = ?,
          room = ?, max_students = ?, status = ?
      WHERE academy_id = ? AND id = ?
    `;
    const [result] = await db.execute(query, [
      data.class_id,
      data.teacher_id,
      data.subject,
      data.title,
      data.description,
      data.schedule_date,
      data.start_time,
      data.end_time,
      data.room,
      data.max_students,
      data.status,
      academyId,
      id
    ]);
    return result.affectedRows > 0;
  }

  /**
   * 수업 일정 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} id - 일정 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, id) {
    const query = 'DELETE FROM class_schedules WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 수업 상태 변경
   * @param {number} academyId - 학원 ID
   * @param {number} id - 일정 ID
   * @param {string} status - 상태
   * @returns {Promise<boolean>} 성공 여부
   */
  static async updateStatus(academyId, id, status) {
    const query = 'UPDATE class_schedules SET status = ? WHERE academy_id = ? AND id = ?';
    const [result] = await db.execute(query, [status, academyId, id]);
    return result.affectedRows > 0;
  }

  /**
   * 학생을 수업에 추가
   * @param {number} scheduleId - 일정 ID
   * @param {number} studentId - 학생 ID
   * @param {number} enrollmentId - 수강신청 ID
   * @returns {Promise<number>} 참여 ID
   */
  static async addStudent(scheduleId, studentId, enrollmentId = null) {
    const query = `
      INSERT INTO class_schedule_students (schedule_id, student_id, enrollment_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE enrollment_id = VALUES(enrollment_id)
    `;
    const [result] = await db.execute(query, [scheduleId, studentId, enrollmentId]);

    // current_students 업데이트
    await db.execute(
      `UPDATE class_schedules
       SET current_students = (SELECT COUNT(*) FROM class_schedule_students WHERE schedule_id = ?)
       WHERE id = ?`,
      [scheduleId, scheduleId]
    );

    return result.insertId;
  }

  /**
   * 학생을 수업에서 제거
   * @param {number} scheduleId - 일정 ID
   * @param {number} studentId - 학생 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async removeStudent(scheduleId, studentId) {
    const query = 'DELETE FROM class_schedule_students WHERE schedule_id = ? AND student_id = ?';
    const [result] = await db.execute(query, [scheduleId, studentId]);

    // current_students 업데이트
    await db.execute(
      `UPDATE class_schedules
       SET current_students = (SELECT COUNT(*) FROM class_schedule_students WHERE schedule_id = ?)
       WHERE id = ?`,
      [scheduleId, scheduleId]
    );

    return result.affectedRows > 0;
  }

  /**
   * 수업 참여 학생 목록 조회
   * @param {number} scheduleId - 일정 ID
   * @returns {Promise<Array>} 학생 목록
   */
  static async getStudents(scheduleId) {
    const query = `
      SELECT css.*, s.name as student_name, s.student_phone, s.parent_phone
      FROM class_schedule_students css
      JOIN students s ON css.student_id = s.id
      WHERE css.schedule_id = ?
      ORDER BY s.name
    `;
    const [rows] = await db.execute(query, [scheduleId]);
    return rows;
  }

  /**
   * 출석 체크
   * @param {number} scheduleId - 일정 ID
   * @param {number} studentId - 학생 ID
   * @param {string} status - 출석 상태
   * @param {string} notes - 비고
   * @returns {Promise<boolean>} 성공 여부
   */
  static async updateAttendance(scheduleId, studentId, status, notes = null) {
    const query = `
      UPDATE class_schedule_students
      SET attendance_status = ?, attendance_time = CURRENT_TIMESTAMP, notes = ?
      WHERE schedule_id = ? AND student_id = ?
    `;
    const [result] = await db.execute(query, [status, notes, scheduleId, studentId]);
    return result.affectedRows > 0;
  }

  /**
   * 일정 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<number>} 일정 개수
   */
  static async count(academyId, filters = {}) {
    let query = 'SELECT COUNT(*) as count FROM class_schedules WHERE academy_id = ?';
    const params = [academyId];

    if (filters.class_id) {
      query += ' AND class_id = ?';
      params.push(filters.class_id);
    }

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  /**
   * 오늘의 수업 일정 조회
   * @param {number} academyId - 학원 ID
   * @returns {Promise<Array>} 오늘의 수업 일정
   */
  static async getTodaySchedules(academyId) {
    const query = `
      SELECT cs.*,
        c.name as class_name,
        t.name as teacher_name
      FROM class_schedules cs
      LEFT JOIN classes c ON cs.class_id = c.id
      LEFT JOIN teachers t ON cs.teacher_id = t.id
      WHERE cs.academy_id = ? AND cs.schedule_date = CURDATE()
      ORDER BY cs.start_time ASC
    `;
    const [rows] = await db.execute(query, [academyId]);
    return rows;
  }

  /**
   * 선생님의 수업 일정 조회
   * @param {number} academyId - 학원 ID
   * @param {number} teacherId - 선생님 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 수업 일정 목록
   */
  static async findByTeacher(academyId, teacherId, filters = {}) {
    let query = `
      SELECT cs.*,
        c.name as class_name,
        (SELECT COUNT(*) FROM class_schedule_students css
         WHERE css.schedule_id = cs.id) as enrolled_count
      FROM class_schedules cs
      LEFT JOIN classes c ON cs.class_id = c.id
      WHERE cs.academy_id = ? AND cs.teacher_id = ?
    `;
    const params = [academyId, teacherId];

    if (filters.start_date) {
      query += ' AND cs.schedule_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND cs.schedule_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY cs.schedule_date DESC, cs.start_time ASC';

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = ClassScheduleModel;
