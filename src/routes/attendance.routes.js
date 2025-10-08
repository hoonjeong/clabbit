const express = require('express');
const router = express.Router();
const AttendanceController = require('../controllers/attendance.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

/**
 * 출결 관리 라우트
 * 모든 라우트는 로그인 및 학원 선택 필요
 */

// === API 라우트 ===
// 키오스크 API (인증 불필요)
router.post('/api/attendance/check-in', AttendanceController.checkIn);
router.post('/api/attendance/check-out', AttendanceController.checkOut);

// 나머지 API는 인증 필요
router.use('/api/attendance', requireAuth, requireAcademy);

// 대시보드
router.get('/api/attendance/dashboard/today', AttendanceController.getTodayDashboard);

// 출결 기록 관리
router.get('/api/attendance/records', AttendanceController.getRecords);
router.get('/api/attendance/records/date/:date', AttendanceController.getRecordsByDate);
router.post('/api/attendance/records/manual', AttendanceController.createManualRecord);
router.put('/api/attendance/records/:id', AttendanceController.updateRecord);
router.delete('/api/attendance/records/:id', AttendanceController.deleteRecord);

// 학생별 출결
router.get('/api/attendance/student/:studentId', AttendanceController.getStudentRecords);

// 통계
router.get('/api/attendance/statistics', AttendanceController.getStatistics);
router.get('/api/attendance/statistics/detailed', AttendanceController.getDetailedStatistics);
router.get('/api/attendance/report', AttendanceController.generateReport);

// 횟수제 관리
router.get('/api/attendance/sessions', AttendanceController.getSessionBasedStudents);
router.put('/api/attendance/sessions/:studentId/adjust', AttendanceController.adjustStudentSessions);
router.post('/api/attendance/sessions/:studentId/add', AttendanceController.addStudentSessions);

// 설정
router.post('/api/attendance/settings/initialize', AttendanceController.initializeSettings);

// 보강 수업 관리
router.get('/api/attendance/makeup', AttendanceController.getMakeupClasses);
router.post('/api/attendance/makeup', AttendanceController.createMakeupClass);
router.put('/api/attendance/makeup/:id', AttendanceController.updateMakeupClass);
router.delete('/api/attendance/makeup/:id', AttendanceController.deleteMakeupClass);
router.post('/api/attendance/makeup/:id/complete', AttendanceController.completeMakeupClass);

// === 페이지 라우트 ===
// 키오스크 모드 (인증 불필요)
router.get('/attendance/kiosk', (req, res) => {
    res.render('attendance/kiosk', {
        title: '출결 체크 - 키오스크',
        layout: false
    });
});

// 나머지 페이지는 인증 필요
router.use('/attendance', requireAuth, requireAcademy);

// 출결 대시보드
router.get('/attendance/dashboard', (req, res) => {
    res.render('attendance/dashboard', {
        title: '출결 관리 대시보드',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'attendance'
    });
});

// 출결 현황 조회
router.get('/attendance/records', (req, res) => {
    res.render('attendance/records', {
        title: '출결 현황',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'attendance'
    });
});

// 출결 통계
router.get('/attendance/statistics', (req, res) => {
    res.render('attendance/statistics', {
        title: '출결 통계',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'attendance'
    });
});

// 횟수제 관리
router.get('/attendance/sessions', (req, res) => {
    res.render('attendance/sessions', {
        title: '횟수제 관리',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'attendance'
    });
});

// 보강 수업 관리
router.get('/attendance/makeup', (req, res) => {
    res.render('attendance/makeup', {
        title: '보강 수업 관리',
        academyName: req.academyName,
        userName: req.user.name,
        page: 'attendance'
    });
});

// 학생 출결 내역 (학생/학부모 접근용)
router.get('/attendance/my-records/:studentId', (req, res) => {
    res.render('attendance/student-records', {
        title: '나의 출결 내역',
        academyName: req.academyName,
        userName: req.user.name,
        studentId: req.params.studentId,
        page: 'attendance'
    });
});

module.exports = router;