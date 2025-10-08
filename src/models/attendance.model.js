const db = require('../config/database');

/**
 * Attendance Model
 * 출석 관리 모델
 */
class AttendanceModel {
  /**
   * 특정 날짜와 수업의 출석 기록 조회
   * @param {number} academyId - 학원 ID
   * @param {number} classId - 수업 ID
   * @param {string} attendanceDate - 출석 날짜 (YYYY-MM-DD)
   * @returns {Promise<Array>} 출석 기록 배열
   */
  static async findByClassAndDate(academyId, classId, attendanceDate) {
    const query = `
      SELECT
        a.*,
        s.name as student_name
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.id
      WHERE s.academy_id = ?
        AND a.class_id = ?
        AND a.attendance_date = ?
      ORDER BY s.name
    `;

    const [rows] = await db.execute(query, [academyId, classId, attendanceDate]);
    return rows;
  }

  /**
   * 특정 날짜의 수업별 출석 수강생 목록 조회
   * @param {number} academyId - 학원 ID
   * @param {number} classId - 수업 ID
   * @param {string} attendanceDate - 출석 날짜 (YYYY-MM-DD)
   * @returns {Promise<Array>} 수강생 목록 (출석 기록 포함)
   */
  static async getStudentsWithAttendance(academyId, classId, attendanceDate) {
    const query = `
      SELECT
        s.id as student_id,
        s.name as student_name,
        s.grade,
        a.id as attendance_id,
        a.status,
        a.check_in_time,
        a.check_out_time,
        a.note
      FROM enrollments e
      INNER JOIN students s ON e.student_id = s.id
      LEFT JOIN attendance a ON s.id = a.student_id
        AND a.class_id = ?
        AND a.attendance_date = ?
      WHERE s.academy_id = ?
        AND e.class_id = ?
        AND e.status = 'active'
      ORDER BY s.name
    `;

    const [rows] = await db.execute(query, [classId, attendanceDate, academyId, classId]);
    return rows;
  }

  /**
   * 출석 기록 생성 또는 업데이트
   * @param {number} academyId - 학원 ID
   * @param {Object} data - 출석 데이터
   * @returns {Promise<Object>} 생성/수정된 출석 기록
   */
  static async createOrUpdate(academyId, data) {
    const { student_id, class_id, attendance_date, status, check_in_time, check_out_time, note, created_by } = data;

    // 학생이 해당 학원에 속하는지 확인
    const [students] = await db.execute(
      'SELECT id FROM students WHERE id = ? AND academy_id = ?',
      [student_id, academyId]
    );

    if (students.length === 0) {
      throw new Error('학생을 찾을 수 없습니다.');
    }

    // 기존 출석 기록 확인
    const [existing] = await db.execute(
      `SELECT * FROM attendance
       WHERE student_id = ? AND class_id = ? AND attendance_date = ?`,
      [student_id, class_id, attendance_date]
    );

    if (existing.length > 0) {
      // 업데이트
      const oldRecord = existing[0];

      const updateQuery = `
        UPDATE attendance
        SET status = ?,
            check_in_time = ?,
            check_out_time = ?,
            note = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await db.execute(updateQuery, [
        status,
        check_in_time || null,
        check_out_time || null,
        note || null,
        oldRecord.id
      ]);

      // 변경 이력 기록 (상태가 변경된 경우)
      if (oldRecord.status !== status) {
        await this.createHistory({
          attendance_id: oldRecord.id,
          old_status: oldRecord.status,
          new_status: status,
          old_check_in_time: oldRecord.check_in_time,
          new_check_in_time: check_in_time || null,
          old_check_out_time: oldRecord.check_out_time,
          new_check_out_time: check_out_time || null,
          reason: '일일 출석 체크',
          modified_by: created_by
        });
      }

      return { id: oldRecord.id, ...data };
    } else {
      // 신규 생성
      const insertQuery = `
        INSERT INTO attendance
        (student_id, class_id, attendance_date, status, check_in_time, check_out_time, note, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await db.execute(insertQuery, [
        student_id,
        class_id,
        attendance_date,
        status,
        check_in_time || null,
        check_out_time || null,
        note || null,
        created_by
      ]);

      return { id: result.insertId, ...data };
    }
  }

  /**
   * 출석 기록 일괄 저장
   * @param {number} academyId - 학원 ID
   * @param {Array} attendanceRecords - 출석 기록 배열
   * @param {number} userId - 작성자 ID
   * @returns {Promise<Object>} 저장 결과
   */
  static async bulkCreateOrUpdate(academyId, attendanceRecords, userId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const results = [];
      for (const record of attendanceRecords) {
        const result = await this.createOrUpdate(academyId, {
          ...record,
          created_by: userId
        });
        results.push(result);
      }

      await connection.commit();
      return { success: true, count: results.length };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 출석 수정 이력 생성
   * @param {Object} historyData - 이력 데이터
   * @returns {Promise<Object>} 생성된 이력
   */
  static async createHistory(historyData) {
    const query = `
      INSERT INTO attendance_history
      (attendance_id, old_status, new_status, old_check_in_time, new_check_in_time,
       old_check_out_time, new_check_out_time, reason, modified_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      historyData.attendance_id,
      historyData.old_status,
      historyData.new_status,
      historyData.old_check_in_time,
      historyData.new_check_in_time,
      historyData.old_check_out_time,
      historyData.new_check_out_time,
      historyData.reason,
      historyData.modified_by
    ]);

    return { id: result.insertId, ...historyData };
  }

  /**
   * 특정 날짜의 출석 통계
   * @param {number} academyId - 학원 ID
   * @param {number} classId - 수업 ID
   * @param {string} attendanceDate - 출석 날짜
   * @returns {Promise<Object>} 통계 데이터
   */
  static async getStatsByDate(academyId, classId, attendanceDate) {
    const query = `
      SELECT
        COUNT(CASE WHEN a.status = '출석' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = '결석' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = '지각' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = '조퇴' THEN 1 END) as early_leave_count,
        COUNT(CASE WHEN a.status = '병결' THEN 1 END) as sick_count,
        COUNT(CASE WHEN a.status = '공결' THEN 1 END) as official_count,
        COUNT(*) as total_checked
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.id
      WHERE s.academy_id = ?
        AND a.class_id = ?
        AND a.attendance_date = ?
    `;

    const [rows] = await db.execute(query, [academyId, classId, attendanceDate]);
    return rows[0] || {
      present_count: 0,
      absent_count: 0,
      late_count: 0,
      early_leave_count: 0,
      sick_count: 0,
      official_count: 0,
      total_checked: 0
    };
  }

  /**
   * 월별 출석 현황 조회
   * @param {number} academyId - 학원 ID
   * @param {string} yearMonth - 년월 (YYYY-MM)
   * @param {number} studentId - 학생 ID (선택)
   * @param {number} classId - 수업 ID (선택)
   * @returns {Promise<Array>} 출석 현황 배열
   */
  static async getMonthlyAttendance(academyId, yearMonth, studentId = null, classId = null) {
    let query = `
      SELECT
        a.attendance_date,
        a.status,
        a.check_in_time,
        a.check_out_time,
        a.note,
        s.id as student_id,
        s.name as student_name,
        s.grade,
        c.id as class_id,
        c.class_name,
        c.teacher_name
      FROM attendance a
      INNER JOIN students s ON a.student_id = s.id
      INNER JOIN classes c ON a.class_id = c.id
      WHERE s.academy_id = ?
        AND DATE_FORMAT(a.attendance_date, '%Y-%m') = ?
    `;

    const params = [academyId, yearMonth];

    if (studentId) {
      query += ` AND a.student_id = ?`;
      params.push(studentId);
    }

    if (classId) {
      query += ` AND a.class_id = ?`;
      params.push(classId);
    }

    query += ` ORDER BY a.attendance_date DESC, s.name`;

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 학생별 출석 통계 조회
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작일 (YYYY-MM-DD)
   * @param {string} endDate - 종료일 (YYYY-MM-DD)
   * @param {number} classId - 수업 ID (선택)
   * @returns {Promise<Array>} 학생별 출석 통계
   */
  static async getStudentAttendanceStats(academyId, startDate, endDate, classId = null) {
    let query = `
      SELECT
        s.id as student_id,
        s.name as student_name,
        s.grade,
        COUNT(CASE WHEN a.status = '출석' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = '결석' THEN 1 END) as absent_count,
        COUNT(CASE WHEN a.status = '지각' THEN 1 END) as late_count,
        COUNT(CASE WHEN a.status = '조퇴' THEN 1 END) as early_leave_count,
        COUNT(CASE WHEN a.status = '병결' THEN 1 END) as sick_count,
        COUNT(CASE WHEN a.status = '공결' THEN 1 END) as official_count,
        COUNT(*) as total_days,
        ROUND(COUNT(CASE WHEN a.status = '출석' THEN 1 END) * 100.0 / COUNT(*), 1) as attendance_rate
      FROM students s
      LEFT JOIN attendance a ON s.id = a.student_id
        AND a.attendance_date BETWEEN ? AND ?
    `;

    const params = [startDate, endDate];

    if (classId) {
      query += ` AND a.class_id = ?`;
      params.push(classId);
    }

    query += `
      WHERE s.academy_id = ?
        AND s.status = 'active'
      GROUP BY s.id, s.name, s.grade
      HAVING total_days > 0
      ORDER BY s.name
    `;

    params.push(academyId);

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 출석 수정 이력 조회
   * @param {number} academyId - 학원 ID
   * @param {number} attendanceId - 출석 ID (선택)
   * @param {string} startDate - 시작일 (선택)
   * @param {string} endDate - 종료일 (선택)
   * @returns {Promise<Array>} 수정 이력 배열
   */
  static async getAttendanceHistory(academyId, attendanceId = null, startDate = null, endDate = null) {
    let query = `
      SELECT
        h.*,
        a.attendance_date,
        s.name as student_name,
        c.class_name,
        u.owner_name as modified_by_name
      FROM attendance_history h
      INNER JOIN attendance a ON h.attendance_id = a.id
      INNER JOIN students s ON a.student_id = s.id
      INNER JOIN classes c ON a.class_id = c.id
      LEFT JOIN users u ON h.modified_by = u.id
      WHERE s.academy_id = ?
    `;

    const params = [academyId];

    if (attendanceId) {
      query += ` AND h.attendance_id = ?`;
      params.push(attendanceId);
    }

    if (startDate && endDate) {
      query += ` AND DATE(h.modified_at) BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY h.modified_at DESC`;

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 학원의 활성 수업 목록 조회 (특정 요일)
   * @param {number} academyId - 학원 ID
   * @param {string} dayOfWeek - 요일 (월요일, 화요일, 수요일, 목요일, 금요일, 토요일, 일요일)
   * @returns {Promise<Array>} 수업 목록
   */
  static async getActiveClasses(academyId, dayOfWeek = null) {
    let query = `
      SELECT
        c.id,
        c.class_name,
        c.teacher_name,
        c.schedule,
        COUNT(CASE WHEN e.status = 'active' THEN 1 END) as student_count
      FROM classes c
      LEFT JOIN enrollments e ON c.id = e.class_id
      WHERE c.academy_id = ?
        AND c.status = 'active'
    `;

    const params = [academyId];

    // 요일 필터링
    if (dayOfWeek) {
      query += ` AND c.schedule LIKE ?`;
      params.push(`%${dayOfWeek}%`);
    }

    query += `
      GROUP BY c.id, c.class_name, c.teacher_name, c.schedule
      ORDER BY c.class_name
    `;

    const [rows] = await db.execute(query, params);
    return rows;
  }
}

module.exports = AttendanceModel;
