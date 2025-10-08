const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 대시보드 라우터
 * 모든 라우트는 requireAuth + requireAcademy 미들웨어 필수
 */

// ==================== 페이지 라우트 ====================
router.get('/dashboard', requireAuth, requireAcademy, (req, res) => {
  res.render('dashboard', {
    title: '대시보드 - 클래빗',
    page: 'dashboard',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// ==================== API 라우트 ====================
router.get('/api/dashboard/stats', requireAuth, requireAcademy, DashboardController.getStats);
router.get('/api/dashboard/monthly-trend', requireAuth, requireAcademy, DashboardController.getMonthlyTrend);
router.get('/api/dashboard/charts/:period', requireAuth, requireAcademy, DashboardController.getChartData);
router.get('/api/dashboard/issues', requireAuth, requireAcademy, DashboardController.getIssues);

module.exports = router;
