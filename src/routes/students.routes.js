const express = require('express');
const router = express.Router();
const multer = require('multer');
const StudentsController = require('../controllers/students.controller');
const EnrollmentsController = require('../controllers/enrollments.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');
const { FILE_UPLOAD } = require('../config/constants');

/**
 * 학생 관리 라우터
 * 모든 라우트는 requireAuth + requireAcademy 미들웨어 필수
 */

// 엑셀/CSV 파일 업로드 설정
const upload = multer({
  dest: FILE_UPLOAD.UPLOAD_DIR,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ];
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));

    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('엑셀(.xlsx, .xls) 또는 CSV 파일만 업로드 가능합니다.'));
    }
  }
});

// ==================== 페이지 라우트 ====================
router.get('/students', requireAuth, requireAcademy, (req, res) => {
  res.render('students/index', {
    title: '학생 현황 - 클래빗',
    page: 'students',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

router.get('/students/new', requireAuth, requireAcademy, (req, res) => {
  res.render('students/new', {
    title: '학생 등록 - 클래빗',
    page: 'students',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

router.get('/students/bulk', requireAuth, requireAcademy, (req, res) => {
  res.render('students/bulk', {
    title: '학생 일괄 등록 - 클래빗',
    page: 'students',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

router.get('/students/withdrawn', requireAuth, requireAcademy, (req, res) => {
  res.render('students/withdrawn', {
    title: '퇴원생 관리 - 클래빗',
    page: 'students',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

router.get('/students/:id', requireAuth, requireAcademy, (req, res) => {
  res.render('students/detail', {
    title: '학생 상세 - 클래빗',
    page: 'students',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자',
    studentId: req.params.id
  });
});

router.get('/students/:id/enroll', requireAuth, requireAcademy, (req, res) => {
  res.render('students/enroll', {
    title: '수업 등록 - 클래빗',
    page: 'students',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자',
    studentId: req.params.id
  });
});

// ==================== API 라우트 ====================
// 학생 검색
router.get('/api/students/search', requireAuth, requireAcademy, StudentsController.quickSearch);

// 학생 CRUD
router.get('/api/students', requireAuth, requireAcademy, StudentsController.getList);
router.get('/api/students/new', requireAuth, requireAcademy, StudentsController.getNewStudents);
router.get('/api/students/exits', requireAuth, requireAcademy, StudentsController.getExitStudents);
router.get('/api/students/:id', requireAuth, requireAcademy, StudentsController.getDetail);
router.post('/api/students', requireAuth, requireAcademy, StudentsController.create);
router.put('/api/students/:id', requireAuth, requireAcademy, StudentsController.update);

// 학생 상태 변경
router.post('/api/students/:id/withdraw', requireAuth, requireAcademy, StudentsController.withdraw);
router.post('/api/students/:id/reinstate', requireAuth, requireAcademy, StudentsController.reinstate);

// 엑셀 관련
router.get('/api/students/sample-excel', requireAuth, requireAcademy, StudentsController.downloadSample);
router.post('/api/students/bulk/preview', requireAuth, requireAcademy, upload.single('file'), StudentsController.bulkPreview);
router.post('/api/students/bulk', requireAuth, requireAcademy, upload.single('file'), StudentsController.bulkCreate);

// 수강 내역 관련
router.get('/api/students/:id/enrollments', requireAuth, requireAcademy, EnrollmentsController.getStudentEnrollments);

module.exports = router;
