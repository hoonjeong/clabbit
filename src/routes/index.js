const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const academyRoutes = require('./academy.routes');
const dashboardRoutes = require('./dashboard.routes');
const studentsRoutes = require('./students.routes');
const classesRoutes = require('./classes.routes');
const teachersRoutes = require('./teachers.routes');
const enrollmentsRoutes = require('./enrollments.routes');
const paymentsRoutes = require('./payments.routes');
const attendanceRoutes = require('./attendance.routes');
const billingRoutes = require('./billing.routes');
const performanceRoutes = require('./performance.routes');
const consultationRoutes = require('./consultation.routes');
const aiAnalysisRoutes = require('./ai-analysis.routes');
const communicationsRoutes = require('./communications.routes');

/**
 * 메인 라우터
 * 모든 하위 라우트를 통합 관리
 */

// ==================== 메인 페이지 ====================
router.get('/', (req, res) => {
  res.render('landing', {
    title: '클래빗 - 학원 운영의 모든 것, 이제는 스마트하게',
    page: 'home'
  });
});

// ==================== 하위 라우트 ====================
// 인증 관련 (학원 선택 불필요)
router.use('/', authRoutes);

// 학원 관련 (학원 선택 불필요)
router.use('/', academyRoutes);

// 이하 모든 라우트는 학원 선택 필수 (requireAuth + requireAcademy)
router.use('/', dashboardRoutes);
router.use('/', studentsRoutes);
router.use('/', classesRoutes);
router.use('/', teachersRoutes);
router.use('/api/enrollments', enrollmentsRoutes);
router.use('/', paymentsRoutes);
router.use('/', attendanceRoutes);
router.use('/', billingRoutes);
router.use('/', performanceRoutes);
router.use('/', consultationRoutes);
router.use('/api/ai', aiAnalysisRoutes);

// 소통 관리 모듈
router.use('/', communicationsRoutes);

module.exports = router;
