const db = require('../config/database');

/**
 * 학생 이벤트 모델
 * 학생의 가입/퇴원/재원 이벤트를 기록하여 정확한 통계 제공
 */
class StudentEventModel {
  /**
   * 이벤트 생성
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @param {string} eventType - 이벤트 타입 (join, rejoin, exit)
   * @param {string} eventDate - 이벤트 날짜 (YYYY-MM-DD)
   * @returns {Promise<number>} 생성된 이벤트 ID
   */
  static async create(academyId, studentId, eventType, eventDate) {
    const query = `
      INSERT INTO student_events
      (academy_id, student_id, event_type, event_date)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      academyId,
      studentId,
      eventType,
      eventDate
    ]);

    return result.insertId;
  }

  /**
   * 이벤트 일괄 생성
   * @param {Array<Object>} events - 이벤트 배열
   * @param {number} events[].academy_id - 학원 ID
   * @param {number} events[].student_id - 학생 ID
   * @param {string} events[].event_type - 이벤트 타입
   * @param {string} events[].event_date - 이벤트 날짜
   * @returns {Promise<number>} 생성된 이벤트 수
   */
  static async bulkCreate(events) {
    if (!events || events.length === 0) {
      return 0;
    }

    const query = `
      INSERT INTO student_events
      (academy_id, student_id, event_type, event_date)
      VALUES ?
    `;

    const values = events.map(e => [
      e.academy_id,
      e.student_id,
      e.event_type,
      e.event_date
    ]);

    const [result] = await db.query(query, [values]);
    return result.affectedRows;
  }

  /**
   * 기간별 신규 학생 수 (join + rejoin)
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<number>} 신규 학생 수
   */
  static async countNew(academyId, startDate, endDate) {
    const query = `
      SELECT COUNT(*) as count
      FROM student_events
      WHERE academy_id = ?
        AND event_type IN ('join', 'rejoin')
        AND event_date BETWEEN ? AND ?
    `;

    const [[{ count }]] = await db.execute(query, [academyId, startDate, endDate]);
    return count;
  }

  /**
   * 기간별 퇴원 학생 수
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<number>} 퇴원 학생 수
   */
  static async countExit(academyId, startDate, endDate) {
    const query = `
      SELECT COUNT(*) as count
      FROM student_events
      WHERE academy_id = ?
        AND event_type = 'exit'
        AND event_date BETWEEN ? AND ?
    `;

    const [[{ count }]] = await db.execute(query, [academyId, startDate, endDate]);
    return count;
  }

  /**
   * 기간별 신규 학생 ID 목록
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Array<number>>} 학생 ID 배열
   */
  static async getNewStudentIds(academyId, startDate, endDate) {
    const query = `
      SELECT DISTINCT student_id
      FROM student_events
      WHERE academy_id = ?
        AND event_type IN ('join', 'rejoin')
        AND event_date BETWEEN ? AND ?
      ORDER BY event_date DESC
    `;

    const [rows] = await db.execute(query, [academyId, startDate, endDate]);
    return rows.map(row => row.student_id);
  }

  /**
   * 기간별 퇴원 학생 ID 목록
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Array<number>>} 학생 ID 배열
   */
  static async getExitStudentIds(academyId, startDate, endDate) {
    const query = `
      SELECT DISTINCT student_id
      FROM student_events
      WHERE academy_id = ?
        AND event_type = 'exit'
        AND event_date BETWEEN ? AND ?
      ORDER BY event_date DESC
    `;

    const [rows] = await db.execute(query, [academyId, startDate, endDate]);
    return rows.map(row => row.student_id);
  }

  /**
   * 일별 통계 (차트용)
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작 날짜 (YYYY-MM-DD)
   * @param {string} endDate - 종료 날짜 (YYYY-MM-DD)
   * @returns {Promise<Array<Object>>} 일별 통계 배열
   */
  static async getDailyStats(academyId, startDate, endDate) {
    const query = `
      SELECT
        event_date,
        SUM(CASE WHEN event_type IN ('join', 'rejoin') THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN event_type = 'exit' THEN 1 ELSE 0 END) as exit_count
      FROM student_events
      WHERE academy_id = ?
        AND event_date BETWEEN ? AND ?
      GROUP BY event_date
      ORDER BY event_date ASC
    `;

    const [rows] = await db.execute(query, [academyId, startDate, endDate]);
    return rows;
  }

  /**
   * 학생의 이벤트 이력 조회
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @returns {Promise<Array<Object>>} 이벤트 이력 배열
   */
  static async getStudentHistory(academyId, studentId) {
    const query = `
      SELECT *
      FROM student_events
      WHERE academy_id = ? AND student_id = ?
      ORDER BY event_date DESC
    `;

    const [rows] = await db.execute(query, [academyId, studentId]);
    return rows;
  }
}

module.exports = StudentEventModel;
