const ClassModel = require('../models/class.model');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 수업 관리 컨트롤러
 * 수업 CRUD 및 관리 기능
 */
class ClassesController {
  /**
   * 수업 목록 조회 (페이지네이션, 검색, 필터링, 정렬)
   * @route GET /api/classes
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const {
        search,
        status,
        grade,
        sortBy,
        sortOrder,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;
      const offset = (page - 1) * limit;

      const filters = {
        search,
        status,
        grade,
        sortBy,
        sortOrder,
        limit,
        offset
      };

      const classes = await ClassModel.findAll(academyId, filters);
      const total = await ClassModel.count(academyId, {
        search,
        status,
        grade
      });

      return successResponse(res, {
        classes,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('수업 목록 조회 오류:', error);
      return errorResponse(res, '수업 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수업 상세 조회
   * @route GET /api/classes/:id
   */
  static async getDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const classData = await ClassModel.findById(academyId, id);

      if (!classData) {
        return errorResponse(res, '수업을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, { class: classData });

    } catch (error) {
      console.error('수업 상세 조회 오류:', error);
      return errorResponse(res, '수업 정보를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수업 생성
   * @route POST /api/classes
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const classData = req.body;

      // 필수 필드 검증
      if (!classData.class_name || !classData.start_date) {
        return errorResponse(res, '수업 이름과 시작일은 필수입니다.', 400);
      }

      // 결제 주기 검증
      if (classData.payment_cycle === 'weekly') {
        if (!classData.payment_week_interval || classData.payment_week_interval < 1) {
          return errorResponse(res, '주 단위 결제의 경우 주 간격을 1 이상으로 설정해야 합니다.', 400);
        }
      }

      const classId = await ClassModel.create(academyId, classData);

      return successResponse(res, {
        message: '수업이 등록되었습니다.',
        classId
      }, 201);

    } catch (error) {
      console.error('수업 생성 오류:', error);
      return errorResponse(res, '수업 등록 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수업 수정
   * @route PUT /api/classes/:id
   */
  static async update(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;
      const classData = req.body;

      // 수업 존재 확인
      const existingClass = await ClassModel.findById(academyId, id);
      if (!existingClass) {
        return errorResponse(res, '수업을 찾을 수 없습니다.', 404);
      }

      // 필수 필드 검증
      if (!classData.class_name || !classData.start_date) {
        return errorResponse(res, '수업 이름과 시작일은 필수입니다.', 400);
      }

      // 결제 주기 검증
      if (classData.payment_cycle === 'weekly') {
        if (!classData.payment_week_interval || classData.payment_week_interval < 1) {
          return errorResponse(res, '주 단위 결제의 경우 주 간격을 1 이상으로 설정해야 합니다.', 400);
        }
      }

      const updated = await ClassModel.update(academyId, id, classData);

      if (!updated) {
        return errorResponse(res, '수업 수정에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '수업 정보가 수정되었습니다.'
      });

    } catch (error) {
      console.error('수업 수정 오류:', error);
      return errorResponse(res, '수업 수정 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수업 삭제
   * @route DELETE /api/classes/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const deleted = await ClassModel.delete(academyId, id);

      if (!deleted) {
        return errorResponse(res, '수업을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        message: '수업이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('수업 삭제 오류:', error);
      return errorResponse(res, '수업 삭제 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수업 종강 처리
   * @route POST /api/classes/:id/complete
   */
  static async complete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      // 수업 존재 확인
      const existingClass = await ClassModel.findById(academyId, id);
      if (!existingClass) {
        return errorResponse(res, '수업을 찾을 수 없습니다.', 404);
      }

      if (existingClass.status === 'completed') {
        return errorResponse(res, '이미 종강된 수업입니다.', 400);
      }

      const completed = await ClassModel.complete(academyId, id);

      if (!completed) {
        return errorResponse(res, '수업 종강 처리에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '수업이 종강되었습니다.'
      });

    } catch (error) {
      console.error('수업 종강 오류:', error);
      return errorResponse(res, '수업 종강 처리 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 학년 목록 조회
   * @route GET /api/classes/grades
   */
  static async getGrades(req, res) {
    try {
      const academyId = req.academyId;
      const grades = await ClassModel.getGrades(academyId);

      return successResponse(res, { grades });

    } catch (error) {
      console.error('학년 목록 조회 오류:', error);
      return errorResponse(res, '학년 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = ClassesController;
