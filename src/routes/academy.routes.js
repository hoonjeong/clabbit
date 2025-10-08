const express = require('express');
const router = express.Router();
const multer = require('multer');
const AcademyController = require('../controllers/academy.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { FILE_UPLOAD } = require('../config/constants');

/**
 * 학원 관리 라우터
 * 학원 선택, 등록, 전환 등 관리
 * requireAuth 미들웨어만 필요 (requireAcademy 불필요)
 */

// 파일 업로드 설정
const upload = multer({
  dest: FILE_UPLOAD.TEMP_DIR,
  limits: { fileSize: FILE_UPLOAD.MAX_SIZE },
  fileFilter: (req, file, cb) => {
    if (FILE_UPLOAD.ALLOWED_TYPES.IMAGES_AND_PDF.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('이미지 또는 PDF 파일만 업로드 가능합니다.'));
    }
  }
});

// ==================== 페이지 라우트 ====================
router.get('/academies/select', requireAuth, AcademyController.selectPage);
router.get('/academies/new', requireAuth, AcademyController.newPage);

// ==================== API 라우트 ====================
router.get('/api/academies', requireAuth, AcademyController.getList);
router.post('/api/academies', requireAuth, upload.fields([
  { name: 'registration_cert', maxCount: 1 },
  { name: 'business_cert', maxCount: 1 }
]), AcademyController.create);
router.post('/api/academies/enter', requireAuth, AcademyController.enter);

module.exports = router;
