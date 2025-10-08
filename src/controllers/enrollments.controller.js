const EnrollmentModel = require('../models/enrollment.model');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * 수강 등록 컨트롤러
 * 학생과 수업 연결 관리
 */
class EnrollmentsController {
  /**
   * 수강 등록 생성 (단일)
   * @route POST /api/enrollments
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const enrollmentData = req.body;

      // 필수 필드 검증
      if (!enrollmentData.student_id || !enrollmentData.class_id || !enrollmentData.start_date) {
        return errorResponse(res, '학생 ID, 수업 ID, 시작일은 필수입니다.', 400);
      }

      const enrollmentId = await EnrollmentModel.create(academyId, enrollmentData);

      return successResponse(res, {
        message: '수강 등록이 완료되었습니다.',
        enrollmentId
      }, 201);

    } catch (error) {
      console.error('수강 등록 오류:', error);
      return errorResponse(res, error.message || '수강 등록 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수강 등록 생성 (일괄)
   * @route POST /api/enrollments/bulk
   */
  static async bulkCreate(req, res) {
    try {
      const academyId = req.academyId;
      const { student_ids, class_id, start_date, first_month_fee } = req.body;

      // 필수 필드 검증
      if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
        return errorResponse(res, '최소 한 명 이상의 학생을 선택해야 합니다.', 400);
      }

      if (!class_id || !start_date) {
        return errorResponse(res, '수업 ID와 시작일은 필수입니다.', 400);
      }

      const enrollmentIds = await EnrollmentModel.bulkCreate(
        academyId,
        student_ids,
        { class_id, start_date, first_month_fee }
      );

      return successResponse(res, {
        message: `${enrollmentIds.length}명의 학생이 등록되었습니다.`,
        enrollmentIds,
        count: enrollmentIds.length
      }, 201);

    } catch (error) {
      console.error('일괄 등록 오류:', error);
      return errorResponse(res, error.message || '일괄 등록 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 특정 학생의 수강 내역 조회
   * @route GET /api/students/:id/enrollments
   */
  static async getStudentEnrollments(req, res) {
    try {
      const academyId = req.academyId;
      const { id: studentId } = req.params;
      const { status } = req.query;

      const enrollments = await EnrollmentModel.findByStudent(academyId, studentId, { status });

      return successResponse(res, {
        enrollments,
        count: enrollments.length
      });

    } catch (error) {
      console.error('수강 내역 조회 오류:', error);
      return errorResponse(res, '수강 내역을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 특정 수업의 수강생 목록 조회
   * @route GET /api/classes/:id/enrollments
   */
  static async getClassEnrollments(req, res) {
    try {
      const academyId = req.academyId;
      const { id: classId } = req.params;
      const { status } = req.query;

      const enrollments = await EnrollmentModel.findByClass(academyId, classId, { status });

      return successResponse(res, {
        enrollments,
        count: enrollments.length
      });

    } catch (error) {
      console.error('수강생 목록 조회 오류:', error);
      return errorResponse(res, '수강생 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 특정 수업에 등록 가능한 학생 목록 조회
   * @route GET /api/classes/:id/available-students
   */
  static async getAvailableStudents(req, res) {
    try {
      const academyId = req.academyId;
      const { id: classId } = req.params;
      const { grade, search, studentStatus } = req.query;

      const students = await EnrollmentModel.findAvailableStudents(
        academyId,
        classId,
        { grade, search, studentStatus }
      );

      return successResponse(res, {
        students,
        count: students.length
      });

    } catch (error) {
      console.error('등록 가능 학생 조회 오류:', error);
      return errorResponse(res, '학생 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수강 등록 상태 변경
   * @route PATCH /api/enrollments/:id/status
   */
  static async updateStatus(req, res) {
    try {
      const academyId = req.academyId;
      const { id: enrollmentId } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'completed', 'withdrawn'].includes(status)) {
        return errorResponse(res, '유효한 상태값을 입력해주세요.', 400);
      }

      const updated = await EnrollmentModel.updateStatus(academyId, enrollmentId, status);

      if (!updated) {
        return errorResponse(res, '수강 등록을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        message: '수강 상태가 변경되었습니다.'
      });

    } catch (error) {
      console.error('수강 상태 변경 오류:', error);
      return errorResponse(res, '수강 상태 변경 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수강 등록 삭제
   * @route DELETE /api/enrollments/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id: enrollmentId } = req.params;

      const deleted = await EnrollmentModel.delete(academyId, enrollmentId);

      if (!deleted) {
        return errorResponse(res, '수강 등록을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        message: '수강 등록이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('수강 등록 삭제 오류:', error);
      return errorResponse(res, '수강 등록 삭제 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수업별 수강생 명단 조회
   * @route GET /api/classes/:id/students
   */
  static async getClassStudents(req, res) {
    try {
      const academyId = req.academyId;
      const { id: classId } = req.params;
      const { status } = req.query;

      const filters = {};
      if (status) {
        filters.status = status;
      }

      const students = await EnrollmentModel.findClassStudentsDetailed(academyId, classId, filters);

      return successResponse(res, {
        students,
        count: students.length
      });

    } catch (error) {
      console.error('수강생 명단 조회 오류:', error);
      return errorResponse(res, '수강생 명단 조회 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 종강 처리
   * @route POST /api/enrollments/:id/complete
   */
  static async completeEnrollment(req, res) {
    try {
      const academyId = req.academyId;
      const { id: enrollmentId } = req.params;

      const completed = await EnrollmentModel.completeEnrollment(academyId, enrollmentId);

      if (!completed) {
        return errorResponse(res, '수강 등록을 찾을 수 없거나 이미 종강 처리되었습니다.', 404);
      }

      return successResponse(res, {
        message: '종강 처리가 완료되었습니다.'
      });

    } catch (error) {
      console.error('종강 처리 오류:', error);
      return errorResponse(res, '종강 처리 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = EnrollmentsController;
