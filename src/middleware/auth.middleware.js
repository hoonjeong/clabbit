/**
 * 로그인 필수
 */
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    // 세션 무효화 (보안)
    req.session.destroy((err) => {
      if (err) {
        console.error('세션 삭제 실패:', err);
      }

      // 세션 쿠키 명시적 삭제
      res.clearCookie('clabbit_session');
      res.clearCookie('connect.sid');

      // 캐시 제어 헤더 추가 (뒤로가기 방지)
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      // API 요청인 경우
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({
          success: false,
          error: '로그인이 필요합니다.'
        });
      }

      // 페이지 요청인 경우
      return res.redirect('/login');
    });
    return;
  }

  // 세션 재생성 (세션 하이재킹 방지 - 일정 시간마다)
  const now = Date.now();
  const sessionCreatedAt = req.session.createdAt || now;
  const sessionAge = now - sessionCreatedAt;
  const REGENERATE_INTERVAL = 1000 * 60 * 30; // 30분마다 세션 재생성

  if (sessionAge > REGENERATE_INTERVAL) {
    const oldSessionData = {
      userId: req.session.userId,
      userEmail: req.session.userEmail,
      userName: req.session.userName,
      academyId: req.session.academyId
    };

    req.session.regenerate((err) => {
      if (err) {
        console.error('세션 재생성 실패:', err);
        return next();
      }

      // 세션 데이터 복원
      Object.assign(req.session, oldSessionData);
      req.session.createdAt = now;
    });
  }

  // 요청 객체에 사용자 정보 추가
  req.user = {
    id: req.session.userId,
    email: req.session.userEmail,
    name: req.session.userName
  };

  next();
}

/**
 * 로그인한 사용자는 접근 불가 (회원가입, 로그인 페이지)
 */
function requireGuest(req, res, next) {
  if (req.session.userId) {
    return res.redirect('/academies/select');
  }
  next();
}

module.exports = {
  requireAuth,
  requireGuest
};
