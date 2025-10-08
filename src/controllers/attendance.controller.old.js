const AttendanceModel = require('../models/attendance.model');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Attendance Controller
 * 출석 관리 컨트롤러
 */
class AttendanceController {
  /**
   * 일일 출석 체크 페이지
   */
  static async dailyCheckPage(req, res) {
    try {
      res.render('attendance/daily', {
        title: '일일 출석 체크 - 클래빗',
        page: 'attendance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
      });
    } catch (error) {
      console.error('일일 출석 페이지 로드 오류:', error);
      res.status(500).render('error', {
        message: '페이지를 불러오는 중 오류가 발생했습니다.',
        error: error
      });
    }
  }

  /**
   * 활성 수업 목록 조회 API
   */
  static async getActiveClasses(req, res) {
    try {
      const academyId = req.academyId;
      const { date } = req.query;

      // 날짜로부터 요일 추출
      let dayOfWeek = null;
      if (date) {
        const dateObj = new Date(date + 'T00:00:00');
        const dayIndex = dateObj.getDay();
        const daysInKorean = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
        dayOfWeek = daysInKorean[dayIndex];
      }

      const classes = await AttendanceModel.getActiveClasses(academyId, dayOfWeek);

      return successResponse(res, { classes });
    } catch (error) {
      console.error('수업 목록 조회 오류:', error);
      return errorResponse(res, '수업 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 특정 수업의 수강생 목록 및 출석 현황 조회 API
   */
  static async getStudentsWithAttendance(req, res) {
    try {
      const academyId = req.academyId;
      const { class_id, date } = req.query;

      if (!class_id || !date) {
        return errorResponse(res, '수업 ID와 날짜는 필수입니다.', 400);
      }

      const students = await AttendanceModel.getStudentsWithAttendance(
        academyId,
        parseInt(class_id),
        date
      );

      const stats = await AttendanceModel.getStatsByDate(
        academyId,
        parseInt(class_id),
        date
      );

      return successResponse(res, { students, stats });
    } catch (error) {
      console.error('출석 현황 조회 오류:', error);
      return errorResponse(res, '출석 현황을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 출석 기록 저장 API
   */
  static async saveAttendance(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;
      const { attendanceRecords } = req.body;

      if (!attendanceRecords || !Array.isArray(attendanceRecords)) {
        return errorResponse(res, '출석 기록 데이터가 올바르지 않습니다.', 400);
      }

      const result = await AttendanceModel.bulkCreateOrUpdate(
        academyId,
        attendanceRecords,
        userId
      );

      return successResponse(res, {
        message: '출석이 저장되었습니다.',
        count: result.count
      });
    } catch (error) {
      console.error('출석 저장 오류:', error);
      return errorResponse(res, '출석 저장 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 개별 출석 상태 업데이트 API
   */
  static async updateAttendance(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user.id;
      const attendanceData = {
        ...req.body,
        created_by: userId
      };

      const result = await AttendanceModel.createOrUpdate(academyId, attendanceData);

      return successResponse(res, {
        message: '출석 상태가 업데이트되었습니다.',
        attendance: result
      });
    } catch (error) {
      console.error('출석 업데이트 오류:', error);
      return errorResponse(res, error.message || '출석 업데이트 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 출석 통계 조회 API
   */
  static async getStats(req, res) {
    try {
      const academyId = req.academyId;
      const { class_id, date } = req.query;

      if (!class_id || !date) {
        return errorResponse(res, '수업 ID와 날짜는 필수입니다.', 400);
      }

      const stats = await AttendanceModel.getStatsByDate(
        academyId,
        parseInt(class_id),
        date
      );

      return successResponse(res, { stats });
    } catch (error) {
      console.error('출석 통계 조회 오류:', error);
      return errorResponse(res, '출석 통계를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 출석 현황 조회 페이지
   */
  static async statusPage(req, res) {
    try {
      res.render('attendance/status', {
        title: '출석 현황 조회 - 클래빗',
        page: 'attendance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
      });
    } catch (error) {
      console.error('출석 현황 페이지 로드 오류:', error);
      res.status(500).render('error', {
        message: '페이지를 불러오는 중 오류가 발생했습니다.',
        error: error
      });
    }
  }

  /**
   * 월별 출석 현황 조회 API
   */
  static async getMonthlyAttendance(req, res) {
    try {
      const academyId = req.academyId;
      const { month, student_id, class_id } = req.query;

      if (!month) {
        return errorResponse(res, '조회할 년월을 선택해주세요.', 400);
      }

      const attendance = await AttendanceModel.getMonthlyAttendance(
        academyId,
        month,
        student_id ? parseInt(student_id) : null,
        class_id ? parseInt(class_id) : null
      );

      return successResponse(res, { attendance });
    } catch (error) {
      console.error('월별 출석 현황 조회 오류:', error);
      return errorResponse(res, '출석 현황을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 출석 정정/수정 페이지
   */
  static async editPage(req, res) {
    try {
      res.render('attendance/edit', {
        title: '출석 정정/수정 - 클래빗',
        page: 'attendance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
      });
    } catch (error) {
      console.error('출석 정정 페이지 로드 오류:', error);
      res.status(500).render('error', {
        message: '페이지를 불러오는 중 오류가 발생했습니다.',
        error: error
      });
    }
  }

  /**
   * 출석 수정 이력 조회 API
   */
  static async getHistory(req, res) {
    try {
      const academyId = req.academyId;
      const { attendance_id, start_date, end_date } = req.query;

      const history = await AttendanceModel.getAttendanceHistory(
        academyId,
        attendance_id ? parseInt(attendance_id) : null,
        start_date || null,
        end_date || null
      );

      return successResponse(res, { history });
    } catch (error) {
      console.error('출석 이력 조회 오류:', error);
      return errorResponse(res, '출석 이력을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 출석 통계 페이지
   */
  static async statisticsPage(req, res) {
    try {
      res.render('attendance/statistics', {
        title: '출석 통계 - 클래빗',
        page: 'attendance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
      });
    } catch (error) {
      console.error('출석 통계 페이지 로드 오류:', error);
      res.status(500).render('error', {
        message: '페이지를 불러오는 중 오류가 발생했습니다.',
        error: error
      });
    }
  }

  /**
   * 학생별 출석 통계 조회 API
   */
  static async getStudentStats(req, res) {
    try {
      const academyId = req.academyId;
      const { start_date, end_date, class_id } = req.query;

      if (!start_date || !end_date) {
        return errorResponse(res, '조회 기간을 선택해주세요.', 400);
      }

      const stats = await AttendanceModel.getStudentAttendanceStats(
        academyId,
        start_date,
        end_date,
        class_id ? parseInt(class_id) : null
      );

      return successResponse(res, { stats });
    } catch (error) {
      console.error('학생별 출석 통계 조회 오류:', error);
      return errorResponse(res, '출석 통계를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = AttendanceController;
