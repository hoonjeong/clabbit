const express = require('express');
const router = express.Router();
const NotificationsController = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 알림 라우트
 * 모든 라우트는 requireAuth, requireAcademy 미들웨어 적용
 */

// 미들웨어 적용
router.use(requireAuth, requireAcademy);

/**
 * @route GET /api/notifications
 * @desc 알림 목록 조회
 * @access Private
 */
router.get('/', NotificationsController.getList);

/**
 * @route GET /api/notifications/unread-count
 * @desc 읽지 않은 알림 개수 조회
 * @access Private
 */
router.get('/unread-count', NotificationsController.getUnreadCount);

/**
 * @route GET /api/notifications/summary
 * @desc 알림 요약 조회
 * @access Private
 */
router.get('/summary', NotificationsController.getSummary);

/**
 * @route PUT /api/notifications/:id/read
 * @desc 알림 읽음 처리
 * @access Private
 */
router.put('/:id/read', NotificationsController.markAsRead);

/**
 * @route PUT /api/notifications/read-all
 * @desc 모든 알림 읽음 처리
 * @access Private
 */
router.put('/read-all', NotificationsController.markAllAsRead);

/**
 * @route DELETE /api/notifications/:id
 * @desc 알림 삭제
 * @access Private
 */
router.delete('/:id', NotificationsController.delete);

module.exports = router;
