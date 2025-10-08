const express = require('express');
const router = express.Router();
const consultationController = require('../controllers/consultation.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

// 인증 및 학원 선택 확인 미들웨어 적용
router.use(requireAuth);
router.use(requireAcademy);

// ===== 상담 분류 API =====
router.post('/api/consultation/categories', consultationController.createCategory);
router.get('/api/consultation/categories', consultationController.getCategories);

// ===== 상담 기록 API =====
router.post('/api/consultation/records', consultationController.createConsultation);
router.get('/api/consultation/records', consultationController.getConsultations);
router.get('/api/consultation/records/:id', consultationController.getConsultationDetail);
router.put('/api/consultation/records/:id', consultationController.updateConsultation);
router.delete('/api/consultation/records/:id', consultationController.deleteConsultation);
router.put('/api/consultation/records/:id/important', consultationController.toggleImportant);

// 학생별 상담 이력
router.get('/api/consultation/students/:studentId/records', consultationController.getStudentConsultations);

// 미상담자 목록
router.get('/api/consultation/records/pending', consultationController.getPendingStudents);

// 상담 통계
router.get('/api/consultation/statistics', consultationController.getStatistics);
router.get('/api/consultation/dashboard', consultationController.getDashboard);

// ===== 상담톡 (메시징) API =====
router.post('/api/consultation/messages', consultationController.sendMessage);
router.get('/api/consultation/messages', consultationController.getMessages);
router.put('/api/consultation/messages/:id/read', consultationController.markMessageAsRead);
router.delete('/api/consultation/messages/:id', consultationController.deleteMessage);
router.get('/api/consultation/conversations', consultationController.getConversations);
router.get('/api/consultation/conversations/:id/unread', consultationController.getUnreadCount);

// ===== 페이지 라우트 =====

// 상담 기록 관리 페이지
router.get('/consultation/records', requireAuth, requireAcademy, (req, res) => {
    res.render('consultation/records', {
        title: '상담 관리',
        page: 'consultation',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

// 상담 상세 페이지
router.get('/consultation/records/:id', requireAuth, requireAcademy, (req, res) => {
    res.render('consultation/detail', {
        title: '상담 상세',
        page: 'consultation',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자',
        consultationId: req.params.id
    });
});

// 상담 통계 페이지
router.get('/consultation/statistics', requireAuth, requireAcademy, (req, res) => {
    res.render('consultation/statistics', {
        title: '상담 통계',
        page: 'consultation',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

// 상담톡 페이지
router.get('/consultation/messages', requireAuth, requireAcademy, (req, res) => {
    res.render('consultation/messages', {
        title: '상담톡',
        page: 'consultation',
        academyName: req.session.currentAcademyName || '학원',
        userName: req.session.userName || '사용자'
    });
});

module.exports = router;