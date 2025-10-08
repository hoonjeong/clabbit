const express = require('express');
const router = express.Router();
const performanceController = require('../controllers/performance.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

// 인증 및 학원 선택 확인 미들웨어 적용
router.use(requireAuth);
router.use(requireAcademy);

// ===== 시험 관리 API =====

// 시험 관련 라우트
router.post('/api/performance/exams', performanceController.createExam);
router.get('/api/performance/exams', performanceController.getExams);
router.get('/api/performance/exams/:id', performanceController.getExamDetail);
router.put('/api/performance/exams/:id', performanceController.updateExam);
router.delete('/api/performance/exams/:id', performanceController.deleteExam);

// 시험 문항 관련 라우트
router.post('/api/performance/exams/:id/questions', performanceController.addQuestions);
router.get('/api/performance/exams/:id/questions', performanceController.getQuestions);

// 시험 통계
router.get('/api/performance/exams/:id/statistics', performanceController.getExamStatistics);

// ===== 성적 관리 API =====

// 성적 입력 및 관리
router.post('/api/performance/scores', performanceController.createScore);
router.post('/api/performance/scores/bulk', performanceController.bulkCreateScores);
router.get('/api/performance/scores', performanceController.getScores);
router.get('/api/performance/scores/:id', performanceController.getScoreDetail);
router.put('/api/performance/scores/:id', performanceController.updateScore);
router.delete('/api/performance/scores/:id', performanceController.deleteScore);

// 성적 분석
router.get('/api/performance/scores/:id/analysis', performanceController.getScoreAnalysis);

// 학생별 성적
router.get('/api/performance/students/:studentId/scores', performanceController.getStudentScores);
router.get('/api/performance/students/:studentId/trend', performanceController.getStudentTrend);

// 성적 알림
router.post('/api/performance/notify/:scoreId', performanceController.notifyScore);

// ===== 페이지 라우트 =====

// 시험 관리 페이지
router.get('/performance/exams', requireAuth, requireAcademy, (req, res) => {
    res.render('performance/exams', {
        title: '시험 관리',
        page: 'performance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

// 성적 입력 페이지
router.get('/performance/scores/input', requireAuth, requireAcademy, (req, res) => {
    res.render('performance/scores-input', {
        title: '성적 입력',
        page: 'performance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

// 성적 조회 및 분석 페이지
router.get('/performance/analysis', requireAuth, requireAcademy, (req, res) => {
    res.render('performance/analysis', {
        title: '성적 분석',
        page: 'performance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

// 성적표 생성 페이지
router.get('/performance/report', requireAuth, requireAcademy, (req, res) => {
    res.render('performance/report', {
        title: '성적표',
        page: 'performance',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

module.exports = router;