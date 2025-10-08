const express = require('express');
const router = express.Router();
const PaymentsController = require('../controllers/payments.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 수납 관리 라우터
 * 모든 라우트는 requireAuth + requireAcademy 미들웨어 필수
 */

// ==================== 페이지 라우트 ====================
// 원비 수납 페이지
router.get('/payments/tuition', requireAuth, requireAcademy, (req, res) => {
  res.render('payments/tuition', {
    title: '원비 수납 - 클래빗',
    page: 'payments',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// 원비 생성 페이지
router.get('/payments/generate', requireAuth, requireAcademy, (req, res) => {
  res.render('payments/generate', {
    title: '원비 생성 - 클래빗',
    page: 'payments',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// ==================== API 라우트 ====================
// 청구 목록 조회
router.get('/api/billings', requireAuth, requireAcademy, PaymentsController.getBillings);

// 청구 상세 조회
router.get('/api/billings/:id', requireAuth, requireAcademy, PaymentsController.getBillingDetail);

// 청구 삭제
router.delete('/api/billings/:id', requireAuth, requireAcademy, PaymentsController.deleteBilling);

// 월별 청구 자동 생성
router.post('/api/billings/generate', requireAuth, requireAcademy, PaymentsController.generateBillings);

// 선택된 수강생들의 원비 일괄 생성
router.post('/api/billings/bulk-generate', requireAuth, requireAcademy, PaymentsController.bulkGenerateBillings);

// LIVE 상태 수강생 목록 조회
router.get('/api/enrollments/active', requireAuth, requireAcademy, PaymentsController.getActiveEnrollments);

// 수납 처리
router.post('/api/payments', requireAuth, requireAcademy, PaymentsController.createPayment);

// 수납 취소 (가장 최근 수납 취소)
router.post('/api/payments/:id/cancel', requireAuth, requireAcademy, PaymentsController.cancelPayment);

module.exports = router;
