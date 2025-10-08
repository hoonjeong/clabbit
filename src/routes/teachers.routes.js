const express = require('express');
const router = express.Router();
const TeachersController = require('../controllers/teachers.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 강사 관리 라우터
 * 모든 라우트는 requireAuth + requireAcademy 미들웨어 필수
 */

// ==================== 페이지 라우트 ====================
// 강사관리 페이지
router.get('/teachers', requireAuth, requireAcademy, (req, res) => {
  res.render('teachers/index', {
    title: '강사관리 - 클래빗',
    page: 'teachers',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// ==================== API 라우트 ====================
// 강사 CRUD
router.get('/api/teachers', requireAuth, requireAcademy, TeachersController.getList);
router.get('/api/teachers/:id', requireAuth, requireAcademy, TeachersController.getDetail);
router.post('/api/teachers', requireAuth, requireAcademy, TeachersController.create);
router.put('/api/teachers/:id', requireAuth, requireAcademy, TeachersController.update);
router.delete('/api/teachers/:id', requireAuth, requireAcademy, TeachersController.delete);

module.exports = router;
