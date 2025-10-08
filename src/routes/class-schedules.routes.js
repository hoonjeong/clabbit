const express = require('express');
const router = express.Router();
const ClassSchedulesController = require('../controllers/class-schedules.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 수업 일정 라우트
 * 모든 라우트는 requireAuth, requireAcademy 미들웨어 적용
 */

// 미들웨어 적용
router.use(requireAuth, requireAcademy);

/**
 * @route GET /api/class-schedules
 * @desc 수업 일정 목록 조회
 * @access Private
 */
router.get('/', ClassSchedulesController.getList);

/**
 * @route GET /api/class-schedules/today
 * @desc 오늘의 수업 조회
 * @access Private
 */
router.get('/today', ClassSchedulesController.getTodaySchedules);

/**
 * @route GET /api/class-schedules/stats
 * @desc 수업 통계 조회
 * @access Private
 */
router.get('/stats', ClassSchedulesController.getStats);

/**
 * @route GET /api/class-schedules/:id
 * @desc 수업 일정 상세 조회
 * @access Private
 */
router.get('/:id', ClassSchedulesController.getDetail);

/**
 * @route POST /api/class-schedules
 * @desc 수업 일정 생성
 * @access Private
 */
router.post('/', ClassSchedulesController.create);

/**
 * @route PUT /api/class-schedules/:id
 * @desc 수업 일정 수정
 * @access Private
 */
router.put('/:id', ClassSchedulesController.update);

/**
 * @route DELETE /api/class-schedules/:id
 * @desc 수업 일정 삭제
 * @access Private
 */
router.delete('/:id', ClassSchedulesController.delete);

/**
 * @route PUT /api/class-schedules/:id/status
 * @desc 수업 상태 변경
 * @access Private
 */
router.put('/:id/status', ClassSchedulesController.updateStatus);

/**
 * @route POST /api/class-schedules/:id/students
 * @desc 학생 추가
 * @access Private
 */
router.post('/:id/students', ClassSchedulesController.addStudent);

/**
 * @route DELETE /api/class-schedules/:id/students/:studentId
 * @desc 학생 제거
 * @access Private
 */
router.delete('/:id/students/:studentId', ClassSchedulesController.removeStudent);

/**
 * @route PUT /api/class-schedules/:id/attendance
 * @desc 출석 체크
 * @access Private
 */
router.put('/:id/attendance', ClassSchedulesController.updateAttendance);

module.exports = router;
