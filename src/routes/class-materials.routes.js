const express = require('express');
const router = express.Router();
const ClassMaterialsController = require('../controllers/class-materials.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 수업 자료 라우트
 * 모든 라우트는 requireAuth, requireAcademy 미들웨어 적용
 */

// 미들웨어 적용
router.use(requireAuth, requireAcademy);

/**
 * @route GET /api/class-materials
 * @desc 수업 자료 목록 조회
 * @access Private
 */
router.get('/', ClassMaterialsController.getList);

/**
 * @route GET /api/class-materials/:id
 * @desc 수업 자료 상세 조회
 * @access Private
 */
router.get('/:id', ClassMaterialsController.getDetail);

/**
 * @route POST /api/class-materials
 * @desc 수업 자료 생성
 * @access Private
 */
router.post('/', ClassMaterialsController.create);

/**
 * @route PUT /api/class-materials/:id
 * @desc 수업 자료 수정
 * @access Private
 */
router.put('/:id', ClassMaterialsController.update);

/**
 * @route DELETE /api/class-materials/:id
 * @desc 수업 자료 삭제
 * @access Private
 */
router.delete('/:id', ClassMaterialsController.delete);

/**
 * @route GET /api/class-materials/:id/download
 * @desc 자료 다운로드 (다운로드 수 증가)
 * @access Private
 */
router.get('/:id/download', ClassMaterialsController.download);

module.exports = router;
