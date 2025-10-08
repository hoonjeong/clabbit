const express = require('express');
const router = express.Router();
const EnrollmentsController = require('../controllers/enrollments.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

// 모든 라우트에 인증 및 학원 확인 미들웨어 적용
router.use(requireAuth, requireAcademy);

// 수강 등록 생성 (단일)
router.post('/', EnrollmentsController.create);

// 수강 등록 생성 (일괄)
router.post('/bulk', EnrollmentsController.bulkCreate);

// 종강 처리
router.post('/:id/complete', EnrollmentsController.completeEnrollment);

// 수강 등록 상태 변경
router.patch('/:id/status', EnrollmentsController.updateStatus);

// 수강 등록 삭제
router.delete('/:id', EnrollmentsController.delete);

module.exports = router;
