const TeacherModel = require('../models/teacher.model');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 강사 관리 컨트롤러
 * 강사 CRUD 및 관리 기능
 */
class TeachersController {
  /**
   * 강사 목록 조회 (페이지네이션, 검색, 정렬)
   * @route GET /api/teachers
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const {
        search,
        sortBy,
        sortOrder,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;
      const offset = (page - 1) * limit;

      const filters = {
        search,
        sortBy,
        sortOrder,
        limit,
        offset
      };

      const teachers = await TeacherModel.findAll(academyId, filters);
      const total = await TeacherModel.count(academyId, { search });

      return successResponse(res, {
        teachers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('강사 목록 조회 오류:', error);
      return errorResponse(res, '강사 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 강사 상세 조회
   * @route GET /api/teachers/:id
   */
  static async getDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const teacher = await TeacherModel.findById(academyId, id);

      if (!teacher) {
        return errorResponse(res, '강사를 찾을 수 없습니다.', 404);
      }

      return successResponse(res, { teacher });

    } catch (error) {
      console.error('강사 상세 조회 오류:', error);
      return errorResponse(res, '강사 정보를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 강사 생성
   * @route POST /api/teachers
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const teacherData = req.body;

      // 필수 필드 검증
      if (!teacherData.name || !teacherData.phone || !teacherData.email) {
        return errorResponse(res, '이름, 전화번호, 이메일은 필수입니다.', 400);
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(teacherData.email)) {
        return errorResponse(res, '올바른 이메일 형식이 아닙니다.', 400);
      }

      // 이메일 중복 확인
      const emailExists = await TeacherModel.isEmailExists(academyId, teacherData.email);
      if (emailExists) {
        return errorResponse(res, '이미 등록된 이메일입니다.', 400);
      }

      const teacherId = await TeacherModel.create(academyId, teacherData);

      return successResponse(res, {
        message: '강사가 등록되었습니다.',
        teacherId
      }, 201);

    } catch (error) {
      console.error('강사 생성 오류:', error);
      return errorResponse(res, '강사 등록 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 강사 수정
   * @route PUT /api/teachers/:id
   */
  static async update(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const teacherData = req.body;

      // 강사 존재 확인
      const existingTeacher = await TeacherModel.findById(academyId, id);
      if (!existingTeacher) {
        return errorResponse(res, '강사를 찾을 수 없습니다.', 404);
      }

      // 필수 필드 검증
      if (!teacherData.name || !teacherData.phone || !teacherData.email) {
        return errorResponse(res, '이름, 전화번호, 이메일은 필수입니다.', 400);
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(teacherData.email)) {
        return errorResponse(res, '올바른 이메일 형식이 아닙니다.', 400);
      }

      // 이메일 중복 확인 (본인 제외)
      const emailExists = await TeacherModel.isEmailExists(academyId, teacherData.email, id);
      if (emailExists) {
        return errorResponse(res, '이미 등록된 이메일입니다.', 400);
      }

      const updated = await TeacherModel.update(academyId, id, teacherData);

      if (!updated) {
        return errorResponse(res, '강사 수정에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '강사 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('강사 수정 오류:', error);
      return errorResponse(res, '강사 수정 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 강사 삭제
   * @route DELETE /api/teachers/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const deleted = await TeacherModel.delete(academyId, id);

      if (!deleted) {
        return errorResponse(res, '강사를 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        message: '강사가 삭제되었습니다.'
      });

    } catch (error) {
      console.error('강사 삭제 오류:', error);
      return errorResponse(res, '강사 삭제 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = TeachersController;
