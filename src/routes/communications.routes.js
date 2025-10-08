const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 소통 관리 라우터
 * 모든 라우트는 requireAuth + requireAcademy 미들웨어 필수
 */

// ==================== 페이지 라우트 ====================
// 공지사항 페이지
router.get('/communications/announcements', requireAuth, requireAcademy, (req, res) => {
  res.render('communications/announcements', {
    title: '공지사항 - 클래빗',
    page: 'communications',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// 메시지 페이지
router.get('/communications/messages', requireAuth, requireAcademy, (req, res) => {
  res.render('communications/messages', {
    title: '메시지 - 클래빗',
    page: 'communications',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// 알림 설정 페이지
router.get('/communications/notifications', requireAuth, requireAcademy, (req, res) => {
  res.render('communications/notifications', {
    title: '알림 설정 - 클래빗',
    page: 'communications',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

module.exports = router;
