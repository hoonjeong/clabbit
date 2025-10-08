const express = require('express');
const router = express.Router();
const ClassesController = require('../controllers/classes.controller');
const EnrollmentsController = require('../controllers/enrollments.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 수업 관리 라우터
 * 모든 라우트는 requireAuth + requireAcademy 미들웨어 필수
 */

// ==================== 페이지 라우트 ====================
// 수업관리 페이지
router.get('/classes', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/index', {
    title: '수업관리 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// 수업추가 페이지
router.get('/classes/new', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/new', {
    title: '수업추가 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// 수업 상세/수정 페이지
router.get('/classes/:id', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/detail', {
    title: '수업 상세 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자',
    classId: req.params.id
  });
});

// 수업별 학생 일괄 등록 페이지
router.get('/classes/:id/enroll-students', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/enroll-students', {
    title: '학생 일괄 등록 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자',
    classId: req.params.id
  });
});

// 수업별 수강생 명단 페이지
router.get('/classes/:id/students', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/students', {
    title: '수강생 명단 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자',
    classId: req.params.id
  });
});

// ==================== API 라우트 ====================
// 학년 목록 조회 (라우트 순서 중요: :id보다 먼저 와야 함)
router.get('/api/classes/grades', requireAuth, requireAcademy, ClassesController.getGrades);

// 수업 CRUD
router.get('/api/classes', requireAuth, requireAcademy, ClassesController.getList);
router.get('/api/classes/:id', requireAuth, requireAcademy, ClassesController.getDetail);
router.post('/api/classes', requireAuth, requireAcademy, ClassesController.create);
router.put('/api/classes/:id', requireAuth, requireAcademy, ClassesController.update);
router.delete('/api/classes/:id', requireAuth, requireAcademy, ClassesController.delete);

// 수업 종강
router.post('/api/classes/:id/complete', requireAuth, requireAcademy, ClassesController.complete);

// 수강 등록 관련
router.get('/api/classes/:id/enrollments', requireAuth, requireAcademy, EnrollmentsController.getClassEnrollments);
router.get('/api/classes/:id/available-students', requireAuth, requireAcademy, EnrollmentsController.getAvailableStudents);
router.get('/api/classes/:id/students', requireAuth, requireAcademy, EnrollmentsController.getClassStudents);

// ==================== 추가 페이지 라우트 ====================
// 수업 일정 관리
router.get('/classes/schedules', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/schedules', {
    title: '수업 일정 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// 학습 자료 관리
router.get('/classes/materials', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/materials', {
    title: '학습 자료 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

// 과제 관리
router.get('/classes/assignments', requireAuth, requireAcademy, (req, res) => {
  res.render('classes/assignments', {
    title: '과제 관리 - 클래빗',
    page: 'classes',
    academyName: req.session.currentAcademyName || '학원',
    userName: req.session.userName || '사용자'
  });
});

module.exports = router;
