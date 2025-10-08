const AcademyModel = require('../models/academy.model');

/**
 * 현재 세션에 학원이 선택되어 있는지 확인
 */
async function requireAcademy(req, res, next) {
  const academyId = req.session.currentAcademyId;

  if (!academyId) {
    // API 요청인 경우
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({
        success: false,
        error: '학원을 선택해주세요.',
        redirectUrl: '/academies/select'
      });
    }

    // 페이지 요청인 경우
    return res.redirect('/academies/select');
  }

  // 요청 객체에 academy_id 추가
  req.academyId = academyId;
  next();
}

/**
 * 사용자가 해당 학원에 접근 권한이 있는지 확인
 */
async function checkAcademyAccess(req, res, next) {
  const userId = req.session.userId || req.user.id;
  const academyId = req.session.currentAcademyId;

  if (!academyId) {
    return res.redirect('/academies/select');
  }

  const hasAccess = await AcademyModel.hasAccess(userId, academyId);

  if (!hasAccess) {
    // API 요청인 경우
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({
        success: false,
        error: '해당 학원에 접근 권한이 없습니다.'
      });
    }

    // 페이지 요청인 경우
    return res.status(403).send('해당 학원에 접근 권한이 없습니다.');
  }

  req.academyId = academyId;
  next();
}

module.exports = {
  requireAcademy,
  checkAcademyAccess
};
