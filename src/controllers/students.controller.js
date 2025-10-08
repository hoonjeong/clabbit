const StudentModel = require('../models/student.model');
const StudentEventModel = require('../models/student-event.model');
const EnrollmentModel = require('../models/enrollment.model');
const ExcelService = require('../services/excel.service');
const { successResponse, errorResponse } = require('../utils/response');
const { validateStudent } = require('../utils/validator');
const { PAGINATION, STUDENT_STATUS } = require('../config/constants');

/**
 * 학생 관리 컨트롤러
 * 학생 CRUD 및 엑셀 업로드 처리
 */
class StudentsController {
  /**
   * 학생 목록 조회 (페이지네이션, 검색, 필터링)
   * @route GET /api/students
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const {
        search,
        status = STUDENT_STATUS.ACTIVE,
        enrollment_month,
        withdrawal_month,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;
      const offset = (page - 1) * limit;

      const filters = {
        search,
        status,
        enrollment_month,
        withdrawal_month,
        limit,
        offset
      };

      const students = await StudentModel.findAll(academyId, filters);
      const total = await StudentModel.count(academyId, {
        search,
        status,
        enrollment_month,
        withdrawal_month
      });

      return successResponse(res, {
        students,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('학생 목록 조회 오류:', error);
      return errorResponse(res, '학생 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 학생 빠른 검색 (헤더 검색창용)
   * @route GET /api/students/search
   */
  static async quickSearch(req, res) {
    try {
      const academyId = req.academyId;
      const { q } = req.query;

      if (!q || q.trim() === '') {
        return successResponse(res, { students: [] });
      }

      // 최대 10개까지만 반환
      const filters = {
        search: q.trim(),
        status: STUDENT_STATUS.ACTIVE,
        limit: 10,
        offset: 0
      };

      const students = await StudentModel.findAll(academyId, filters);

      return successResponse(res, { students });

    } catch (error) {
      console.error('학생 검색 오류:', error);
      return errorResponse(res, '학생 검색 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 학생 상세 조회
   * @route GET /api/students/:id
   */
  static async getDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const student = await StudentModel.findById(academyId, id);

      if (!student) {
        return errorResponse(res, '학생을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, { student });

    } catch (error) {
      console.error('학생 상세 조회 오류:', error);
      return errorResponse(res, '학생 정보를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 학생 등록
   * @route POST /api/students
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const studentData = req.body;

      // 유효성 검사
      const validation = validateStudent(studentData);
      if (!validation.isValid) {
        return errorResponse(res, validation.errors.join(', '), 400);
      }

      // 중복 전화번호 체크
      const existingStudent = await StudentModel.findByParentPhone(academyId, studentData.parent_phone);
      if (existingStudent) {
        return errorResponse(res, `동일한 학부모 전화번호(${studentData.parent_phone})로 등록된 학생이 이미 있습니다. (학생명: ${existingStudent.name})`, 409);
      }

      const studentId = await StudentModel.create(academyId, studentData);

      // join 이벤트 기록
      const enrollmentDate = studentData.enrollment_date || new Date().toISOString().split('T')[0];
      await StudentEventModel.create(academyId, studentId, 'join', enrollmentDate);

      return successResponse(res, {
        message: '학생이 성공적으로 등록되었습니다.',
        studentId
      }, 201);

    } catch (error) {
      console.error('학생 등록 오류:', error);
      return errorResponse(res, '학생 등록 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 학생 정보 수정
   * @route PUT /api/students/:id
   */
  static async update(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const studentData = req.body;

      // 유효성 검사
      const validation = validateStudent(studentData);
      if (!validation.isValid) {
        return errorResponse(res, validation.errors.join(', '), 400);
      }

      // 중복 전화번호 체크 (자기 자신 제외)
      const existingStudent = await StudentModel.findByParentPhone(academyId, studentData.parent_phone, id);
      if (existingStudent) {
        return errorResponse(res, `동일한 학부모 전화번호(${studentData.parent_phone})로 등록된 다른 학생이 있습니다. (학생명: ${existingStudent.name})`, 409);
      }

      const affectedRows = await StudentModel.update(academyId, id, studentData);

      if (affectedRows === 0) {
        return errorResponse(res, '학생을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        message: '학생 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('학생 정보 수정 오류:', error);
      return errorResponse(res, '학생 정보 수정 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 학생 퇴원 처리
   * @route POST /api/students/:id/withdraw
   */
  static async withdraw(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const affectedRows = await StudentModel.withdraw(academyId, id);

      if (affectedRows === 0) {
        return errorResponse(res, '학생을 찾을 수 없거나 이미 퇴원 처리되었습니다.', 404);
      }

      // 모든 active 수강 등록도 withdrawn으로 변경
      await EnrollmentModel.withdrawAllByStudent(academyId, id);

      // exit 이벤트 기록
      const withdrawalDate = new Date().toISOString().split('T')[0];
      await StudentEventModel.create(academyId, id, 'exit', withdrawalDate);

      return successResponse(res, {
        message: '퇴원 처리가 완료되었습니다.'
      });

    } catch (error) {
      console.error('퇴원 처리 오류:', error);
      return errorResponse(res, '퇴원 처리 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 학생 재원 처리
   * @route POST /api/students/:id/reinstate
   */
  static async reinstate(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const affectedRows = await StudentModel.reinstate(academyId, id);

      if (affectedRows === 0) {
        return errorResponse(res, '학생을 찾을 수 없거나 이미 재원 중입니다.', 404);
      }

      // rejoin 이벤트 기록
      const reinstateDate = new Date().toISOString().split('T')[0];
      await StudentEventModel.create(academyId, id, 'rejoin', reinstateDate);

      return successResponse(res, {
        message: '재원 처리가 완료되었습니다.'
      });

    } catch (error) {
      console.error('재원 처리 오류:', error);
      return errorResponse(res, '재원 처리 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 엑셀 샘플 파일 다운로드
   * @route GET /api/students/sample-excel
   */
  static async downloadSample(req, res) {
    try {
      const buffer = ExcelService.generateSampleFile();

      res.setHeader('Content-Disposition', 'attachment; filename=학생등록_샘플.xlsx');
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.send(buffer);

    } catch (error) {
      console.error('샘플 파일 생성 오류:', error);
      return errorResponse(res, '샘플 파일 생성 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 엑셀 파일 미리보기 (유효성 검사)
   * @route POST /api/students/bulk/preview
   */
  static async bulkPreview(req, res) {
    try {
      if (!req.file) {
        return errorResponse(res, '파일을 업로드해주세요.', 400);
      }

      const result = await ExcelService.parseAndValidate(req.file.path);

      return successResponse(res, result);

    } catch (error) {
      console.error('엑셀 미리보기 오류:', error);
      return errorResponse(res, '파일 처리 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 엑셀 파일로 학생 일괄 등록
   * @route POST /api/students/bulk
   */
  static async bulkCreate(req, res) {
    try {
      const academyId = req.academyId;

      if (!req.file) {
        return errorResponse(res, '파일을 업로드해주세요.', 400);
      }

      const result = await ExcelService.parseAndValidate(req.file.path);

      // 에러가 있으면 등록하지 않음
      if (result.errorCount > 0) {
        return errorResponse(res, '데이터 검증 실패', 400, {
          details: result.errors,
          validCount: result.validCount,
          errorCount: result.errorCount
        });
      }

      // 유효한 학생만 일괄 등록
      const validStudents = result.students.filter(s => !s.error);
      const affectedRows = await StudentModel.bulkCreate(academyId, validStudents);

      // 각 학생에 대해 join 이벤트 기록
      // Note: bulkCreate는 insertId를 반환하지 않으므로,
      // 전화번호를 기준으로 학생을 찾아서 이벤트 기록
      for (const student of validStudents) {
        const createdStudent = await StudentModel.findByParentPhone(
          academyId,
          student.parent_phone
        );
        if (createdStudent) {
          const enrollmentDate = student.enrollment_date || new Date().toISOString().split('T')[0];
          await StudentEventModel.create(academyId, createdStudent.id, 'join', enrollmentDate);
        }
      }

      return successResponse(res, {
        message: `${affectedRows}명의 학생이 성공적으로 등록되었습니다.`,
        count: affectedRows
      });

    } catch (error) {
      console.error('일괄 등록 오류:', error);
      return errorResponse(res, '일괄 등록 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 신규 학생 목록 조회
   * @route GET /api/students/new
   */
  static async getNewStudents(req, res) {
    try {
      const academyId = req.academyId;
      const { period, start_date, end_date } = req.query;

      // 날짜 범위 계산
      let startDate, endDate;
      if (period === 'this_month') {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
      } else if (start_date && end_date) {
        startDate = start_date;
        endDate = end_date;
      } else {
        return errorResponse(res, 'period 또는 start_date/end_date를 제공해야 합니다.', 400);
      }

      // 1. student_events에서 신규 학생 ID 목록 조회
      const studentIds = await StudentEventModel.getNewStudentIds(
        academyId,
        startDate,
        endDate
      );

      // 2. students 테이블에서 상세 정보 조회
      const students = await StudentModel.findByIds(academyId, studentIds);

      return successResponse(res, {
        students,
        period: { startDate, endDate },
        count: students.length
      });

    } catch (error) {
      console.error('신규 학생 목록 조회 오류:', error);
      return errorResponse(res, '신규 학생 목록 조회 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 퇴원 학생 목록 조회
   * @route GET /api/students/exits
   */
  static async getExitStudents(req, res) {
    try {
      const academyId = req.academyId;
      const { period, start_date, end_date } = req.query;

      // 날짜 범위 계산
      let startDate, endDate;
      if (period === 'this_month') {
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
      } else if (start_date && end_date) {
        startDate = start_date;
        endDate = end_date;
      } else {
        return errorResponse(res, 'period 또는 start_date/end_date를 제공해야 합니다.', 400);
      }

      // 1. student_events에서 퇴원 학생 ID 목록 조회
      const studentIds = await StudentEventModel.getExitStudentIds(
        academyId,
        startDate,
        endDate
      );

      // 2. students 테이블에서 상세 정보 조회
      const students = await StudentModel.findByIds(academyId, studentIds);

      return successResponse(res, {
        students,
        period: { startDate, endDate },
        count: students.length
      });

    } catch (error) {
      console.error('퇴원 학생 목록 조회 오류:', error);
      return errorResponse(res, '퇴원 학생 목록 조회 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = StudentsController;
