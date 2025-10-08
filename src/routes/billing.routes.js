const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

// 모든 라우트에 인증 미들웨어 적용
router.use(requireAuth, requireAcademy);

// ============= 청구 항목 관리 =============
// 청구 항목 목록 조회
router.get('/api/billing-items', billingController.getBillingItems);

// 청구 항목 생성
router.post('/api/billing-items', billingController.createBillingItem);

// 청구 항목 수정
router.put('/api/billing-items/:id', billingController.updateBillingItem);

// 청구 항목 삭제 (소프트 삭제)
router.delete('/api/billing-items/:id', billingController.deleteBillingItem);

// ============= 청구 관리 =============
// 청구 생성
router.post('/api/charges', billingController.createCharge);

// 일괄 청구 생성
router.post('/api/charges/bulk', billingController.bulkCreateCharges);

// 청구 상세 조회
router.get('/api/charges/:id', billingController.getCharge);

// 학생별 청구 내역
router.get('/api/students/:student_id/charges', billingController.getStudentCharges);

// 미납 청구 조회
router.get('/api/charges/unpaid', billingController.getUnpaidCharges);

// 월별 청구 조회
router.get('/api/charges/monthly/:month', billingController.getMonthlyCharges);

// 청구 수정
router.put('/api/charges/:id', billingController.updateCharge);

// 청구 취소
router.post('/api/charges/:id/cancel', billingController.cancelCharge);

// ============= 수납 관리 =============
// 수납 등록
router.post('/api/payments', billingController.createPayment);

// 수납 상세 조회
router.get('/api/payments/:id', billingController.getPayment);

// 학생별 수납 내역
router.get('/api/students/:student_id/payments', billingController.getStudentPayments);

// 일별 수납 조회
router.get('/api/payments/daily/:date', billingController.getDailyPayments);

// 기간별 수납 조회
router.get('/api/payments/period', billingController.getPeriodPayments);

// 수납 취소
router.post('/api/payments/:id/cancel', billingController.cancelPayment);

// ============= 통계 및 리포트 =============
// 청구 통계
router.get('/api/billing/statistics/charges', billingController.getChargeStatistics);

// 수납 통계
router.get('/api/billing/statistics/payments', billingController.getPaymentStatistics);

// 미납자 목록
router.get('/api/billing/unpaid-students', billingController.getUnpaidStudents);

// ============= 페이지 렌더링 =============
// 청구/수납 대시보드
router.get('/billing/dashboard', (req, res) => {
    res.render('billing/dashboard', {
        title: '청구/수납 관리',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'billing'
    });
});

// 청구 관리 페이지
router.get('/billing/charges', (req, res) => {
    res.render('billing/charges', {
        title: '청구 관리',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'billing'
    });
});

// 수납 관리 페이지
router.get('/billing/payments', (req, res) => {
    res.render('billing/payments', {
        title: '수납 관리',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'billing'
    });
});

// 미납자 관리 페이지
router.get('/billing/unpaid', (req, res) => {
    res.render('billing/unpaid', {
        title: '미납자 관리',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'billing'
    });
});

// 청구 항목 설정 페이지
router.get('/billing/items', (req, res) => {
    res.render('billing/items', {
        title: '청구 항목 설정',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'billing'
    });
});

// 청구/수납 통계 페이지
router.get('/billing/statistics', (req, res) => {
    res.render('billing/statistics', {
        title: '청구/수납 통계',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'billing'
    });
});

module.exports = router;