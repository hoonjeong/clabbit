const express = require('express');
const router = express.Router();
const MessagesController = require('../controllers/messages.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 메시지 라우트
 * 모든 라우트는 requireAuth, requireAcademy 미들웨어 적용
 */

// 미들웨어 적용
router.use(requireAuth, requireAcademy);

/**
 * @route GET /api/messages/conversations
 * @desc 대화방 목록 조회
 * @access Private
 */
router.get('/conversations', MessagesController.getConversations);

/**
 * @route POST /api/messages/conversations
 * @desc 대화방 생성
 * @access Private
 */
router.post('/conversations', MessagesController.createConversation);

/**
 * @route GET /api/messages/conversations/:conversationId
 * @desc 특정 대화방의 메시지 조회
 * @access Private
 */
router.get('/conversations/:conversationId', MessagesController.getMessages);

/**
 * @route POST /api/messages/conversations/:conversationId/messages
 * @desc 메시지 전송
 * @access Private
 */
router.post('/conversations/:conversationId/messages', MessagesController.sendMessage);

/**
 * @route DELETE /api/messages/conversations/:conversationId
 * @desc 대화방 삭제
 * @access Private
 */
router.delete('/conversations/:conversationId', MessagesController.deleteConversation);

/**
 * @route GET /api/messages/student/:studentId
 * @desc 학생과의 대화방 조회 또는 생성
 * @access Private
 */
router.get('/student/:studentId', MessagesController.getStudentConversation);

/**
 * @route GET /api/messages/unread-count
 * @desc 읽지 않은 메시지 개수 조회
 * @access Private
 */
router.get('/unread-count', MessagesController.getUnreadCount);

/**
 * @route GET /api/messages/stats
 * @desc 대화 통계 조회
 * @access Private
 */
router.get('/stats', MessagesController.getStats);

module.exports = router;
