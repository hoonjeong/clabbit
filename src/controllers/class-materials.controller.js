const ClassMaterialModel = require('../models/class-material.model');
const CommunicationService = require('../services/communication.service');
const { successResponse, errorResponse } = require('../utils/response');
const { PAGINATION } = require('../config/constants');

/**
 * 수업 자료 관리 컨트롤러
 */
class ClassMaterialsController {
  /**
   * 수업 자료 목록 조회
   * @route GET /api/class-materials
   */
  static async getList(req, res) {
    try {
      const academyId = req.academyId;
      const {
        schedule_id,
        teacher_id,
        material_type,
        is_public,
        search,
        page = PAGINATION.DEFAULT_PAGE,
        limit = PAGINATION.DEFAULT_LIMIT
      } = req.query;

      const offset = (page - 1) * limit;

      const filters = {
        schedule_id,
        teacher_id,
        material_type,
        is_public: is_public !== undefined ? is_public === 'true' : undefined,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const materials = await ClassMaterialModel.findAll(academyId, filters);
      const total = await ClassMaterialModel.count(academyId, filters);

      return successResponse(res, {
        materials,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('수업 자료 목록 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 자료 상세 조회
   * @route GET /api/class-materials/:id
   */
  static async getDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const material = await ClassMaterialModel.findById(academyId, id);
      if (!material) {
        return errorResponse(res, '수업 자료를 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        material
      });
    } catch (error) {
      console.error('수업 자료 상세 조회 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 자료 생성
   * @route POST /api/class-materials
   */
  static async create(req, res) {
    try {
      const academyId = req.academyId;
      const {
        schedule_id,
        title,
        description,
        material_type,
        external_link,
        is_public
      } = req.body;

      const materialData = {
        schedule_id: schedule_id || null,
        teacher_id: req.user.id,
        title,
        description,
        material_type,
        external_link: external_link || null,
        is_public: is_public !== undefined ? is_public : true
      };

      // 파일 업로드 처리
      if (req.files && req.files.file) {
        const file = req.files.file;
        const fileData = await CommunicationService.handleFileUpload(file, 'materials');

        materialData.file_path = fileData.file_path;
        materialData.file_name = fileData.file_name;
        materialData.file_size = fileData.file_size;
      }

      const materialId = await ClassMaterialModel.create(academyId, materialData);

      return successResponse(res, {
        message: '수업 자료가 등록되었습니다.',
        materialId
      }, 201);
    } catch (error) {
      console.error('수업 자료 생성 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 자료 수정
   * @route PUT /api/class-materials/:id
   */
  static async update(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      // 기존 자료 확인
      const existing = await ClassMaterialModel.findById(academyId, id);
      if (!existing) {
        return errorResponse(res, '수업 자료를 찾을 수 없습니다.', 404);
      }

      // 작성자 또는 관리자만 수정 가능
      if (existing.teacher_id !== req.user.id && req.user.role !== 'admin') {
        return errorResponse(res, '수정 권한이 없습니다.', 403);
      }

      const success = await ClassMaterialModel.update(academyId, id, req.body);

      if (!success) {
        return errorResponse(res, '수업 자료 수정에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '수업 자료가 수정되었습니다.'
      });
    } catch (error) {
      console.error('수업 자료 수정 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 수업 자료 삭제
   * @route DELETE /api/class-materials/:id
   */
  static async delete(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      // 기존 자료 확인
      const existing = await ClassMaterialModel.findById(academyId, id);
      if (!existing) {
        return errorResponse(res, '수업 자료를 찾을 수 없습니다.', 404);
      }

      // 작성자 또는 관리자만 삭제 가능
      if (existing.teacher_id !== req.user.id && req.user.role !== 'admin') {
        return errorResponse(res, '삭제 권한이 없습니다.', 403);
      }

      const success = await ClassMaterialModel.delete(academyId, id);

      if (!success) {
        return errorResponse(res, '수업 자료 삭제에 실패했습니다.', 500);
      }

      return successResponse(res, {
        message: '수업 자료가 삭제되었습니다.'
      });
    } catch (error) {
      console.error('수업 자료 삭제 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }

  /**
   * 자료 다운로드 (다운로드 수 증가)
   * @route GET /api/class-materials/:id/download
   */
  static async download(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const material = await ClassMaterialModel.findById(academyId, id);
      if (!material) {
        return errorResponse(res, '수업 자료를 찾을 수 없습니다.', 404);
      }

      // 다운로드 수 증가
      await ClassMaterialModel.incrementDownloadCount(academyId, id);

      return successResponse(res, {
        file_path: material.file_path,
        file_name: material.file_name
      });
    } catch (error) {
      console.error('자료 다운로드 오류:', error);
      return errorResponse(res, error.message, 500);
    }
  }
}

module.exports = ClassMaterialsController;
