/**
 * 모바일 앱 API 컨트롤러
 * 모바일 애플리케이션을 위한 RESTful API
 */

const StudentModel = require('../models/student.model');
const AttendanceModel = require('../models/attendance.model');
const StudentScoreModel = require('../models/student-score.model');
const PaymentRecordModel = require('../models/payment-record.model');
const ConsultationMessageModel = require('../models/consultation-message.model');
const NotificationModel = require('../models/notification.model');
const AIAnalysisService = require('../services/ai-analysis.service');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class MobileAPIController {
    /**
     * 모바일 로그인
     */
    async login(req, res) {
        try {
            const { email, password, deviceToken } = req.body;

            // 사용자 인증
            const user = await this.authenticateUser(email, password);

            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: '이메일 또는 비밀번호가 올바르지 않습니다.'
                });
            }

            // JWT 토큰 생성
            const token = jwt.sign(
                {
                    userId: user.id,
                    email: user.email,
                    role: user.role,
                    academyId: user.academy_id
                },
                process.env.JWT_SECRET || 'clabbit_mobile_secret',
                { expiresIn: '30d' }
            );

            // 디바이스 토큰 저장 (푸시 알림용)
            if (deviceToken) {
                await this.saveDeviceToken(user.id, deviceToken);
            }

            res.json({
                success: true,
                data: {
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        academyId: user.academy_id,
                        academyName: user.academy_name
                    }
                }
            });
        } catch (error) {
            console.error('모바일 로그인 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 사용자 인증
     */
    async authenticateUser(email, password) {
        // 실제 구현에서는 UserModel 사용
        // 여기서는 예시 구현
        return {
            id: 1,
            email: email,
            name: '홍길동',
            role: 'parent',
            academy_id: 1,
            academy_name: '클래빗 학원'
        };
    }

    /**
     * 디바이스 토큰 저장
     */
    async saveDeviceToken(userId, token) {
        // FCM 토큰 저장 로직
        console.log(`Device token saved for user ${userId}: ${token}`);
    }

    /**
     * 대시보드 데이터
     */
    async getDashboard(req, res) {
        try {
            const userId = req.user.id;
            const academyId = req.user.academyId;
            const role = req.user.role;

            const dashboardData = {
                announcements: [],
                todaySchedule: [],
                recentActivities: [],
                quickStats: {}
            };

            if (role === 'parent') {
                // 학부모용 대시보드
                const children = await this.getChildren(userId, academyId);

                dashboardData.children = children;
                dashboardData.quickStats = {
                    totalChildren: children.length,
                    todayAttendance: await this.getTodayAttendance(children),
                    unpaidBills: await this.getUnpaidBills(children),
                    unreadMessages: await this.getUnreadMessages(userId)
                };

                // 각 자녀의 최근 활동
                for (const child of children) {
                    const activities = await this.getRecentActivities(child.id);
                    dashboardData.recentActivities.push(...activities);
                }
            } else if (role === 'student') {
                // 학생용 대시보드
                const studentId = userId; // 학생 본인

                dashboardData.quickStats = {
                    attendanceRate: await this.getAttendanceRate(studentId),
                    averageScore: await this.getAverageScore(studentId),
                    assignments: await this.getPendingAssignments(studentId),
                    nextExam: await this.getNextExam(studentId)
                };

                dashboardData.todaySchedule = await this.getTodaySchedule(studentId);
                dashboardData.recentActivities = await this.getRecentActivities(studentId);
            }

            // 공통 공지사항
            dashboardData.announcements = await this.getAnnouncements(academyId);

            res.json({
                success: true,
                data: dashboardData
            });
        } catch (error) {
            console.error('대시보드 데이터 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 자녀 목록 조회
     */
    async getChildren(parentUserId, academyId) {
        // 실제 구현 시 parent_student_relations 테이블 조회
        return [
            {
                id: 1,
                name: '홍길동',
                grade: '중2',
                school: '클래빗중학교',
                profileImage: '/images/default-student.png'
            }
        ];
    }

    /**
     * 오늘 출석 현황
     */
    async getTodayAttendance(children) {
        let attended = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const child of children) {
            const attendance = await AttendanceModel.getByDate(
                child.academy_id || 1,
                child.id,
                today
            );
            if (attendance && attendance.status === 'present') {
                attended++;
            }
        }

        return `${attended}/${children.length}`;
    }

    /**
     * 미납 청구 조회
     */
    async getUnpaidBills(children) {
        let totalUnpaid = 0;

        for (const child of children) {
            // 미납 금액 계산
            const unpaid = await PaymentRecordModel.getUnpaidAmount(
                child.academy_id || 1,
                child.id
            );
            totalUnpaid += unpaid;
        }

        return totalUnpaid;
    }

    /**
     * 읽지 않은 메시지
     */
    async getUnreadMessages(userId) {
        return await ConsultationMessageModel.getUnreadCount(
            1, // academyId
            userId,
            'parent'
        );
    }

    /**
     * 최근 활동
     */
    async getRecentActivities(studentId) {
        return [
            {
                type: 'attendance',
                title: '출석 완료',
                description: '오늘 16:00 출석',
                timestamp: new Date(),
                icon: 'check-circle'
            },
            {
                type: 'score',
                title: '시험 결과',
                description: '영어 모의고사 85점',
                timestamp: new Date(Date.now() - 86400000),
                icon: 'chart-line'
            }
        ];
    }

    /**
     * 출석률 계산
     */
    async getAttendanceRate(studentId) {
        // 최근 30일 출석률
        const attendanceRecords = await AttendanceModel.getStudentAttendance(
            1, // academyId
            studentId,
            30
        );

        if (attendanceRecords.length === 0) return 0;

        const presentCount = attendanceRecords.filter(a => a.status === 'present').length;
        return Math.round((presentCount / attendanceRecords.length) * 100);
    }

    /**
     * 평균 점수
     */
    async getAverageScore(studentId) {
        const scores = await StudentScoreModel.getStudentScores(1, studentId);
        if (scores.length === 0) return 0;

        const sum = scores.reduce((acc, score) => acc + score.percentage, 0);
        return Math.round(sum / scores.length);
    }

    /**
     * 미완료 과제
     */
    async getPendingAssignments(studentId) {
        // 과제 시스템 구현 시 연동
        return 3;
    }

    /**
     * 다음 시험 일정
     */
    async getNextExam(studentId) {
        // 시험 일정 시스템 구현 시 연동
        return {
            subject: '수학',
            date: new Date(Date.now() + 7 * 86400000),
            type: '단원평가'
        };
    }

    /**
     * 오늘 일정
     */
    async getTodaySchedule(studentId) {
        return [
            {
                time: '16:00',
                subject: '영어',
                teacher: '김선생님',
                room: '201호'
            },
            {
                time: '18:00',
                subject: '수학',
                teacher: '박선생님',
                room: '203호'
            }
        ];
    }

    /**
     * 공지사항
     */
    async getAnnouncements(academyId) {
        return [
            {
                id: 1,
                title: '2월 정기 모의고사 안내',
                content: '2월 15일 전과목 모의고사가 실시됩니다.',
                date: new Date(),
                priority: 'high'
            }
        ];
    }

    /**
     * 학생 정보 조회
     */
    async getStudentInfo(req, res) {
        try {
            const { studentId } = req.params;
            const academyId = req.user.academyId;

            const student = await StudentModel.findById(academyId, studentId);

            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: '학생을 찾을 수 없습니다.'
                });
            }

            // AI 분석 포함
            const aiAnalysis = await AIAnalysisService.analyzeStudentPerformance(
                academyId,
                studentId
            );

            res.json({
                success: true,
                data: {
                    student,
                    analysis: aiAnalysis.data
                }
            });
        } catch (error) {
            console.error('학생 정보 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 출석 체크
     */
    async checkIn(req, res) {
        try {
            const { studentId, location } = req.body;
            const academyId = req.user.academyId;

            // 위치 확인 (옵션)
            if (location) {
                const isValidLocation = await this.verifyLocation(location, academyId);
                if (!isValidLocation) {
                    return res.status(400).json({
                        success: false,
                        error: '학원 위치에서만 출석 체크가 가능합니다.'
                    });
                }
            }

            // 출석 처리
            const attendance = await AttendanceModel.create(academyId, {
                student_id: studentId,
                date: new Date(),
                status: 'present',
                check_in_time: new Date().toTimeString().split(' ')[0]
            });

            // 푸시 알림 전송
            await this.sendPushNotification(
                req.user.id,
                '출석 완료',
                `${new Date().toLocaleTimeString()} 출석이 완료되었습니다.`
            );

            res.json({
                success: true,
                data: attendance
            });
        } catch (error) {
            console.error('출석 체크 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 위치 확인
     */
    async verifyLocation(location, academyId) {
        // 학원 위치와 비교
        // 실제 구현 시 학원 위치 정보와 거리 계산
        return true;
    }

    /**
     * 성적 조회
     */
    async getScores(req, res) {
        try {
            const { studentId } = req.params;
            const academyId = req.user.academyId;

            const scores = await StudentScoreModel.getStudentScores(
                academyId,
                studentId
            );

            // 과목별 그룹화
            const scoresBySubject = {};
            scores.forEach(score => {
                const subject = score.subject_name || '전체';
                if (!scoresBySubject[subject]) {
                    scoresBySubject[subject] = [];
                }
                scoresBySubject[subject].push({
                    date: score.exam_date,
                    score: score.percentage,
                    rank: score.rank,
                    grade: score.grade
                });
            });

            res.json({
                success: true,
                data: {
                    recent: scores.slice(0, 5),
                    bySubject: scoresBySubject,
                    statistics: await this.calculateScoreStatistics(scores)
                }
            });
        } catch (error) {
            console.error('성적 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 통계 계산
     */
    async calculateScoreStatistics(scores) {
        if (scores.length === 0) {
            return {
                average: 0,
                highest: 0,
                lowest: 0,
                trend: 'stable'
            };
        }

        const percentages = scores.map(s => s.percentage);
        const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;

        // 추이 계산
        let trend = 'stable';
        if (scores.length >= 3) {
            const recent = scores.slice(0, 3).map(s => s.percentage);
            const older = scores.slice(3, 6).map(s => s.percentage);
            if (older.length > 0) {
                const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
                const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
                if (recentAvg > olderAvg + 5) trend = 'improving';
                else if (recentAvg < olderAvg - 5) trend = 'declining';
            }
        }

        return {
            average: Math.round(average),
            highest: Math.max(...percentages),
            lowest: Math.min(...percentages),
            trend
        };
    }

    /**
     * 결제 내역
     */
    async getPayments(req, res) {
        try {
            const { studentId } = req.params;
            const academyId = req.user.academyId;

            const payments = await PaymentRecordModel.getByStudent(
                academyId,
                studentId
            );

            const summary = {
                totalPaid: 0,
                totalDue: 0,
                unpaidCount: 0
            };

            payments.forEach(payment => {
                if (payment.status === 'paid') {
                    summary.totalPaid += payment.amount;
                } else {
                    summary.totalDue += payment.amount;
                    summary.unpaidCount++;
                }
            });

            res.json({
                success: true,
                data: {
                    payments: payments.slice(0, 10), // 최근 10건
                    summary
                }
            });
        } catch (error) {
            console.error('결제 내역 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 상담 메시지 전송
     */
    async sendMessage(req, res) {
        try {
            const { recipientId, studentId, message, attachments } = req.body;
            const academyId = req.user.academyId;
            const senderId = req.user.id;

            const messageData = await ConsultationMessageModel.send(academyId, {
                sender_id: senderId,
                sender_type: req.user.role,
                receiver_id: recipientId,
                receiver_type: 'teacher',
                student_id: studentId,
                message_content: message,
                attachments: attachments ? JSON.stringify(attachments) : null
            });

            // 푸시 알림
            await this.sendPushNotification(
                recipientId,
                '새 메시지',
                message.substring(0, 50)
            );

            res.json({
                success: true,
                data: messageData
            });
        } catch (error) {
            console.error('메시지 전송 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 메시지 목록
     */
    async getMessages(req, res) {
        try {
            const { studentId } = req.params;
            const academyId = req.user.academyId;
            const userId = req.user.id;
            const userType = req.user.role;

            const messages = await ConsultationMessageModel.getMessages(
                academyId,
                studentId,
                userId,
                userType,
                { limit: 50 }
            );

            res.json({
                success: true,
                data: messages
            });
        } catch (error) {
            console.error('메시지 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 푸시 알림 전송
     */
    async sendPushNotification(userId, title, body) {
        try {
            // FCM 또는 APNS를 통한 푸시 알림 전송
            console.log(`Push notification to user ${userId}: ${title} - ${body}`);

            // 알림 기록 저장
            await NotificationModel.create({
                user_id: userId,
                title,
                body,
                type: 'push',
                sent_at: new Date()
            });

            return true;
        } catch (error) {
            console.error('푸시 알림 전송 실패:', error);
            return false;
        }
    }

    /**
     * 알림 목록
     */
    async getNotifications(req, res) {
        try {
            const userId = req.user.id;

            const notifications = await NotificationModel.getByUser(userId, {
                limit: 50
            });

            res.json({
                success: true,
                data: notifications
            });
        } catch (error) {
            console.error('알림 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 설정 조회
     */
    async getSettings(req, res) {
        try {
            const userId = req.user.id;

            const settings = {
                notifications: {
                    attendance: true,
                    score: true,
                    payment: true,
                    message: true,
                    announcement: true
                },
                privacy: {
                    shareScore: false,
                    shareAttendance: true
                },
                app: {
                    theme: 'light',
                    language: 'ko',
                    autoLogin: true
                }
            };

            res.json({
                success: true,
                data: settings
            });
        } catch (error) {
            console.error('설정 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 설정 업데이트
     */
    async updateSettings(req, res) {
        try {
            const userId = req.user.id;
            const { settings } = req.body;

            // 설정 저장 로직

            res.json({
                success: true,
                message: '설정이 저장되었습니다.'
            });
        } catch (error) {
            console.error('설정 업데이트 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new MobileAPIController();