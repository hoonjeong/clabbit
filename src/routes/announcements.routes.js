const express = require('express');
const router = express.Router();
const AnnouncementsController = require('../controllers/announcements.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 공지사항 라우트
 * 모든 라우트는 requireAuth, requireAcademy 미들웨어 적용
 */

// 미들웨어 적용
router.use(requireAuth, requireAcademy);

/**
 * @route GET /api/announcements
 * @desc 공지사항 목록 조회
 * @access Private
 */
router.get('/', AnnouncementsController.getList);

/**
 * @route GET /api/announcements/stats
 * @desc 공지사항 통계 조회
 * @access Private
 */
router.get('/stats', AnnouncementsController.getStats);

/**
 * @route GET /api/announcements/:id
 * @desc 공지사항 상세 조회
 * @access Private
 */
router.get('/:id', AnnouncementsController.getDetail);

/**
 * @route POST /api/announcements
 * @desc 공지사항 생성
 * @access Private
 */
router.post('/', AnnouncementsController.create);

/**
 * @route PUT /api/announcements/:id
 * @desc 공지사항 수정
 * @access Private
 */
router.put('/:id', AnnouncementsController.update);

/**
 * @route DELETE /api/announcements/:id
 * @desc 공지사항 삭제
 * @access Private
 */
router.delete('/:id', AnnouncementsController.delete);

module.exports = router;
