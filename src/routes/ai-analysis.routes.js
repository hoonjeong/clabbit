/**
 * AI 분석 라우트
 * AI 기반 성적 분석 및 추천 API
 */

const express = require('express');
const router = express.Router();
const aiAnalysisController = require('../controllers/ai-analysis.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

// 모든 라우트에 인증 미들웨어 적용
router.use(requireAuth, requireAcademy);

// 학생 분석
router.get('/students/:studentId/analysis', aiAnalysisController.analyzeStudent);
router.get('/students/:studentId/pattern', aiAnalysisController.predictPattern);
router.get('/students/:studentId/study-plan', aiAnalysisController.generateStudyPlan);
router.get('/students/:studentId/habits', aiAnalysisController.suggestHabits);
router.get('/students/:studentId/motivation', aiAnalysisController.getMotivation);
router.get('/students/:studentId/parent-report', aiAnalysisController.generateParentReport);

// 차트 데이터
router.get('/students/:studentId/charts/prediction', aiAnalysisController.getPredictionChart);
router.get('/students/:studentId/charts/strengths', aiAnalysisController.getStrengthsChart);

// 학급 분석
router.get('/classes/:classId/analysis', aiAnalysisController.analyzeClass);

// 대시보드 인사이트
router.get('/dashboard/insights', aiAnalysisController.getDashboardInsights);

// ===== 페이지 라우트 =====

// AI 분석 페이지
router.get('/ai/analysis', (req, res) => {
    res.render('ai/analysis', {
        title: 'AI 성적 분석',
        page: 'ai',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

module.exports = router;