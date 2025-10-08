const express = require('express');
const router = express.Router();
const ClassAssignmentsController = require('../controllers/class-assignments.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 수업 과제 라우트
 * 모든 라우트는 requireAuth, requireAcademy 미들웨어 적용
 */

// 미들웨어 적용
router.use(requireAuth, requireAcademy);

/**
 * @route GET /api/class-assignments
 * @desc 과제 목록 조회
 * @access Private
 */
router.get('/', ClassAssignmentsController.getList);

/**
 * @route GET /api/class-assignments/pending
 * @desc 미제출 과제 목록 조회
 * @access Private
 */
router.get('/pending', ClassAssignmentsController.getPending);

/**
 * @route GET /api/class-assignments/:id
 * @desc 과제 상세 조회
 * @access Private
 */
router.get('/:id', ClassAssignmentsController.getDetail);

/**
 * @route POST /api/class-assignments
 * @desc 과제 생성
 * @access Private
 */
router.post('/', ClassAssignmentsController.create);

/**
 * @route PUT /api/class-assignments/:id
 * @desc 과제 수정
 * @access Private
 */
router.put('/:id', ClassAssignmentsController.update);

/**
 * @route DELETE /api/class-assignments/:id
 * @desc 과제 삭제
 * @access Private
 */
router.delete('/:id', ClassAssignmentsController.delete);

/**
 * @route POST /api/class-assignments/:id/submit
 * @desc 과제 제출
 * @access Private
 */
router.post('/:id/submit', ClassAssignmentsController.submit);

/**
 * @route GET /api/class-assignments/:id/my-submission
 * @desc 학생의 과제 제출 조회
 * @access Private
 */
router.get('/:id/my-submission', ClassAssignmentsController.getMySubmission);

/**
 * @route PUT /api/class-assignments/:id/submissions/:submissionId/grade
 * @desc 과제 채점
 * @access Private
 */
router.put('/:id/submissions/:submissionId/grade', ClassAssignmentsController.grade);

module.exports = router;
