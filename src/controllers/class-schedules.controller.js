const ClassScheduleModel = require('../models/class-schedule.model');
const ClassScheduleService = require('../services/class-schedule.service');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 수업 일정 관리 컨트롤러
 */
class ClassSchedulesController {
  /**
   * 수업 일정 목록 조회
   * @route GET /api/class-schedules
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const {
        class_id,
        teacher_id,
        status,
        start_date,
        end_date,
        search,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;

      const offset = (page - 1) * limit;

      const filters = {
        class_id,
        teacher_id,
        status,
        start_date,
        end_date,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const schedules = await ClassScheduleModel.findAll(academyId, filters);
      const total = await ClassScheduleModel.count(academyId, filters);

      return successResponse(res, {
        schedules,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('수업 일정 목록 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 일정 상세 조회
   * @route GET /api/class-schedules/:id
   */
  static async getDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const scheduleDetail = await ClassScheduleService.getScheduleDetail(academyId, id);

      return successResponse(res, scheduleDetail);
    } catch (error) {
      console.error('수업 일정 상세 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 일정 생성
   * @route POST /api/class-schedules
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const scheduleData = req.body;

      // 일정 충돌 확인
      const hasConflict = await ClassScheduleService.checkScheduleConflict(
        academyId,
        scheduleData.teacher_id,
        scheduleData.schedule_date,
        scheduleData.start_time,
        scheduleData.end_time
      );

      if (hasConflict) {
        return errorResponse(res, '해당 시간에 다른 수업이 예정되어 있습니다.', 409);
      }

      // 반복 일정인 경우
      if (scheduleData.is_recurring && scheduleData.recurring_pattern) {
        const scheduleIds = await ClassScheduleService.createRecurringSchedules(
          academyId,
          scheduleData
        );

        return successResponse(res, {
          message: `${scheduleIds.length}개의 반복 일정이 생성되었습니다.`,
          scheduleIds
        }, 201);
      }

      // 단일 일정 생성
      const scheduleId = await ClassScheduleModel.create(academyId, scheduleData);

      // 클래스가 지정된 경우 학생 자동 등록
      if (scheduleData.class_id) {
        await ClassScheduleService.autoEnrollStudents(
          academyId,
          scheduleId,
          scheduleData.class_id
        );
      }

      return successResponse(res, {
        message: '수업 일정이 생성되었습니다.',
        scheduleId
      }, 201);
    } catch (error) {
      console.error('수업 일정 생성 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 일정 수정
   * @route PUT /api/class-schedules/:id
   */
  static async update(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const updateData = req.body;

      // 기존 일정 확인
      const existing = await ClassScheduleModel.findById(academyId, id);
      if (!existing) {
        return errorResponse(res, '수업 일정을 찾을 수 없습니다.', 404);
      }

      // 일정 충돌 확인 (시간이 변경된 경우)
      if (updateData.teacher_id || updateData.schedule_date || updateData.start_time || updateData.end_time) {
        const hasConflict = await ClassScheduleService.checkScheduleConflict(
          academyId,
          updateData.teacher_id || existing.teacher_id,
          updateData.schedule_date || existing.schedule_date,
          updateData.start_time || existing.start_time,
          updateData.end_time || existing.end_time,
          id
        );

        if (hasConflict) {
          return errorResponse(res, '해당 시간에 다른 수업이 예정되어 있습니다.', 409);
        }
      }

      const success = await ClassScheduleModel.update(academyId, id, updateData);

      if (!success) {
        return errorResponse(res, '수업 일정 수정에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '수업 일정이 수정되었습니다.'
      });
    } catch (error) {
      console.error('수업 일정 수정 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 일정 삭제
   * @route DELETE /api/class-schedules/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const success = await ClassScheduleModel.delete(academyId, id);

      if (!success) {
        return errorResponse(res, '수업 일정 삭제에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '수업 일정이 삭제되었습니다.'
      });
    } catch (error) {
      console.error('수업 일정 삭제 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 상태 변경
   * @route PUT /api/class-schedules/:id/status
   */
  static async updateStatus(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const { status } = req.body;

      if (!['scheduled', 'ongoing', 'completed', 'cancelled'].includes(status)) {
        return errorResponse(res, '유효하지 않은 상태입니다.', 400);
      }

      const success = await ClassScheduleModel.updateStatus(academyId, id, status);

      if (!success) {
        return errorResponse(res, '상태 변경에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '수업 상태가 변경되었습니다.'
      });
    } catch (error) {
      console.error('수업 상태 변경 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 학생 추가
   * @route POST /api/class-schedules/:id/students
   */
  static async addStudent(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const { student_id, enrollment_id } = req.body;

      // 수업 정원 확인
      const schedule = await ClassScheduleModel.findById(academyId, id);
      if (!schedule) {
        return errorResponse(res, '수업 일정을 찾을 수 없습니다.', 404);
      }

      if (schedule.max_students && schedule.current_students >= schedule.max_students) {
        return errorResponse(res, '수업 정원이 초과되었습니다.', 409);
      }

      await ClassScheduleModel.addStudent(id, student_id, enrollment_id);

      return successResponse(res, {
        message: '학생이 추가되었습니다.'
      }, 201);
    } catch (error) {
      console.error('학생 추가 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 학생 제거
   * @route DELETE /api/class-schedules/:id/students/:studentId
   */
  static async removeStudent(req, res) {
    try {
      const { id, studentId } = req.params;

      const success = await ClassScheduleModel.removeStudent(id, studentId);

      if (!success) {
        return errorResponse(res, '학생 제거에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '학생이 제거되었습니다.'
      });
    } catch (error) {
      console.error('학생 제거 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 출석 체크
   * @route PUT /api/class-schedules/:id/attendance
   */
  static async updateAttendance(req, res) {
    try {
      const { id } = req.params;
      const { attendance_data } = req.body;

      if (!Array.isArray(attendance_data)) {
        return errorResponse(res, '출석 데이터 형식이 올바르지 않습니다.', 400);
      }

      const updatedCount = await ClassScheduleService.bulkUpdateAttendance(id, attendance_data);

      return successResponse(res, {
        message: `${updatedCount}명의 출석이 업데이트되었습니다.`,
        updatedCount
      });
    } catch (error) {
      console.error('출석 체크 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 오늘의 수업 조회
   * @route GET /api/class-schedules/today
   */
  static async getTodaySchedules(req, res) {
    try {
      const academyId = req.academyId;

      const schedules = await ClassScheduleModel.getTodaySchedules(academyId);

      return successResponse(res, {
        schedules
      });
    } catch (error) {
      console.error('오늘의 수업 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 통계 조회
   * @route GET /api/class-schedules/stats
   */
  static async getStats(req, res) {
    try {
      const academyId = req.academyId;
      const { start_date, end_date } = req.query;

      if (!start_date || !end_date) {
        return errorResponse(res, '시작일과 종료일을 입력해주세요.', 400);
      }

      const stats = await ClassScheduleService.getClassStats(academyId, start_date, end_date);

      return successResponse(res, stats);
    } catch (error) {
      console.error('수업 통계 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = ClassSchedulesController;
