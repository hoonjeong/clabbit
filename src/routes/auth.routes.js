const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { requireAuth, requireGuest } = require('../middleware/auth.middleware');

/**
 * 인증 라우터
 * 회원가입, 로그인, 로그아웃
 * requireGuest: 로그인하지 않은 사용자만 접근 가능
 */

// ==================== 페이지 라우트 ====================
router.get('/signup', requireGuest, (req, res) => {
  res.render('signup', {
    title: '회원가입 - 클래빗',
    page: 'signup'
  });
});

router.get('/login', requireGuest, (req, res) => {
  res.render('login', {
    title: '로그인 - 클래빗',
    page: 'login'
  });
});

router.get('/profile', requireAuth, AuthController.getProfile);

router.get('/logout', AuthController.logout);

// ==================== API 라우트 ====================
router.post('/api/auth/signup', AuthController.signup);
router.post('/api/auth/login', AuthController.login);
router.post('/api/auth/refresh', AuthController.refreshToken);
router.post('/api/auth/logout', AuthController.logout);
router.post('/api/auth/change-password', requireAuth, AuthController.changePassword);

module.exports = router;
