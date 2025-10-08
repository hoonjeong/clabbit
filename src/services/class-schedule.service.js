const ClassScheduleModel = require('../models/class-schedule.model');
const ClassMaterialModel = require('../models/class-material.model');
const ClassAssignmentModel = require('../models/class-assignment.model');
const NotificationModel = require('../models/notification.model');
const EnrollmentModel = require('../models/enrollment.model');

/**
 * 수업 일정 서비스
 * 수업 일정 관련 비즈니스 로직
 */
class ClassScheduleService {
  /**
   * 반복 일정 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} scheduleData - 일정 데이터
   * @returns {Promise<Array<number>>} 생성된 일정 ID 목록
   */
  static async createRecurringSchedules(academyId, scheduleData) {
    const { recurring_pattern, start_date, end_date } = scheduleData;

    if (!recurring_pattern || !start_date || !end_date) {
      throw new Error('반복 일정 생성에 필요한 정보가 부족합니다.');
    }

    const scheduleIds = [];
    const dates = this.generateRecurringDates(
      start_date,
      end_date,
      recurring_pattern
    );

    for (const date of dates) {
      const scheduleId = await ClassScheduleModel.create(academyId, {
        ...scheduleData,
        schedule_date: date,
        is_recurring: true
      });
      scheduleIds.push(scheduleId);
    }

    return scheduleIds;
  }

  /**
   * 반복 날짜 생성
   * @param {string} startDate - 시작일
   * @param {string} endDate - 종료일
   * @param {Object} pattern - 반복 패턴 { type: 'daily'|'weekly', interval: 1, days: [0,1,2...] }
   * @returns {Array<string>} 날짜 목록
   */
  static generateRecurringDates(startDate, endDate, pattern) {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (pattern.type === 'daily') {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + pattern.interval)) {
        dates.push(this.formatDate(d));
      }
    } else if (pattern.type === 'weekly' && pattern.days) {
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (pattern.days.includes(d.getDay())) {
          dates.push(this.formatDate(d));
        }
      }
    }

    return dates;
  }

  /**
   * 날짜 포맷 (YYYY-MM-DD)
   * @param {Date} date - 날짜 객체
   * @returns {string} 포맷된 날짜
   */
  static formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 수업 일정 및 학생 자동 등록
   * @param {number} academyId - 학원 ID
   * @param {number} scheduleId - 일정 ID
   * @param {number} classId - 클래스 ID
   * @returns {Promise<number>} 등록된 학생 수
   */
  static async autoEnrollStudents(academyId, scheduleId, classId) {
    // 클래스의 수강 중인 학생 조회
    const enrollments = await EnrollmentModel.getActiveEnrollments(academyId, classId);

    let enrolledCount = 0;
    for (const enrollment of enrollments) {
      await ClassScheduleModel.addStudent(
        scheduleId,
        enrollment.student_id,
        enrollment.id
      );
      enrolledCount++;
    }

    return enrolledCount;
  }

  /**
   * 수업 시작 알림 전송
   * @param {number} academyId - 학원 ID
   * @param {number} scheduleId - 일정 ID
   * @returns {Promise<number>} 알림 전송 수
   */
  static async sendClassStartNotification(academyId, scheduleId) {
    const schedule = await ClassScheduleModel.findById(academyId, scheduleId);
    const students = await ClassScheduleModel.getStudents(scheduleId);

    if (!schedule || students.length === 0) {
      return 0;
    }

    // 학생들의 사용자 ID 조회 (부모 계정)
    const userIds = []; // TODO: 학생-부모 매핑 필요

    await NotificationModel.createBulk(academyId, userIds, {
      notification_type: 'schedule',
      title: `수업 시작: ${schedule.title}`,
      content: `${schedule.subject} 수업이 ${schedule.start_time}에 시작됩니다.`,
      link_type: 'schedule',
      link_id: scheduleId
    });

    return userIds.length;
  }

  /**
   * 일정 충돌 확인
   * @param {number} academyId - 학원 ID
   * @param {number} teacherId - 선생님 ID
   * @param {string} scheduleDate - 날짜
   * @param {string} startTime - 시작 시간
   * @param {string} endTime - 종료 시간
   * @param {number} excludeScheduleId - 제외할 일정 ID (수정 시)
   * @returns {Promise<boolean>} 충돌 여부
   */
  static async checkScheduleConflict(
    academyId,
    teacherId,
    scheduleDate,
    startTime,
    endTime,
    excludeScheduleId = null
  ) {
    const db = require('../config/database');

    let query = `
      SELECT COUNT(*) as count FROM class_schedules
      WHERE academy_id = ? AND teacher_id = ? AND schedule_date = ?
      AND status != 'cancelled'
      AND (
        (start_time < ? AND end_time > ?) OR
        (start_time < ? AND end_time > ?) OR
        (start_time >= ? AND end_time <= ?)
      )
    `;
    const params = [
      academyId,
      teacherId,
      scheduleDate,
      endTime, startTime,
      startTime, startTime,
      startTime, endTime
    ];

    if (excludeScheduleId) {
      query += ' AND id != ?';
      params.push(excludeScheduleId);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count > 0;
  }

  /**
   * 수업 요약 통계
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작일
   * @param {string} endDate - 종료일
   * @returns {Promise<Object>} 통계 정보
   */
  static async getClassStats(academyId, startDate, endDate) {
    const db = require('../config/database');

    // 전체 수업 수
    const totalQuery = `
      SELECT COUNT(*) as total FROM class_schedules
      WHERE academy_id = ? AND schedule_date BETWEEN ? AND ?
    `;
    const [totalRows] = await db.execute(totalQuery, [academyId, startDate, endDate]);

    // 상태별 수업 수
    const statusQuery = `
      SELECT status, COUNT(*) as count FROM class_schedules
      WHERE academy_id = ? AND schedule_date BETWEEN ? AND ?
      GROUP BY status
    `;
    const [statusRows] = await db.execute(statusQuery, [academyId, startDate, endDate]);

    const statusStats = {};
    statusRows.forEach(row => {
      statusStats[row.status] = row.count;
    });

    // 과목별 수업 수
    const subjectQuery = `
      SELECT subject, COUNT(*) as count FROM class_schedules
      WHERE academy_id = ? AND schedule_date BETWEEN ? AND ?
      GROUP BY subject
      ORDER BY count DESC
      LIMIT 5
    `;
    const [subjectRows] = await db.execute(subjectQuery, [academyId, startDate, endDate]);

    return {
      total: totalRows[0].total,
      by_status: statusStats,
      by_subject: subjectRows
    };
  }

  /**
   * 출석률 계산
   * @param {number} scheduleId - 일정 ID
   * @returns {Promise<Object>} 출석률 정보
   */
  static async calculateAttendanceRate(scheduleId) {
    const db = require('../config/database');

    const query = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN attendance_status = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN attendance_status = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN attendance_status = 'late' THEN 1 ELSE 0 END) as late,
        SUM(CASE WHEN attendance_status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM class_schedule_students
      WHERE schedule_id = ?
    `;
    const [rows] = await db.execute(query, [scheduleId]);

    const stats = rows[0];
    const attendanceRate = stats.total > 0
      ? ((stats.present + stats.late) / stats.total * 100).toFixed(2)
      : 0;

    return {
      total: stats.total,
      present: stats.present,
      absent: stats.absent,
      late: stats.late,
      pending: stats.pending,
      attendance_rate: attendanceRate
    };
  }

  /**
   * 수업 자료 및 과제 포함한 상세 정보
   * @param {number} academyId - 학원 ID
   * @param {number} scheduleId - 일정 ID
   * @returns {Promise<Object>} 상세 정보
   */
  static async getScheduleDetail(academyId, scheduleId) {
    const schedule = await ClassScheduleModel.findById(academyId, scheduleId);
    if (!schedule) {
      throw new Error('수업 일정을 찾을 수 없습니다.');
    }

    const students = await ClassScheduleModel.getStudents(scheduleId);
    const materials = await ClassMaterialModel.findAll(academyId, { schedule_id: scheduleId });
    const assignments = await ClassAssignmentModel.findAll(academyId, { schedule_id: scheduleId });
    const attendanceRate = await this.calculateAttendanceRate(scheduleId);

    return {
      schedule,
      students,
      materials,
      assignments,
      attendance: attendanceRate
    };
  }

  /**
   * 일괄 출석 체크
   * @param {number} scheduleId - 일정 ID
   * @param {Array} attendanceData - 출석 데이터 [{student_id, status, notes}]
   * @returns {Promise<number>} 처리된 출석 수
   */
  static async bulkUpdateAttendance(scheduleId, attendanceData) {
    let updatedCount = 0;

    for (const data of attendanceData) {
      const success = await ClassScheduleModel.updateAttendance(
        scheduleId,
        data.student_id,
        data.status,
        data.notes
      );
      if (success) {
        updatedCount++;
      }
    }

    return updatedCount;
  }
}

module.exports = ClassScheduleService;
