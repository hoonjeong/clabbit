const db = require('../config/database');
const StatisticsService = require('../services/statistics.service');
const NotificationService = require('../services/notification-v2.service');
const bcrypt = require('bcrypt');
const { PAGINATION, USER_ROLES } = require('../config/constants');

class AdminController {
    // 관리자 대시보드
    async getDashboard(req, res) {
        try {
            const academyId = req.academyId;
            const userId = req.user.id;

            // 권한 확인
            const [roleCheck] = await db.execute(
                'SELECT role FROM user_academy_roles WHERE user_id = ? AND academy_id = ?',
                [userId, academyId]
            );

            if (!roleCheck.length || !['owner', 'admin'].includes(roleCheck[0].role)) {
                return res.status(403).json({
                    success: false,
                    error: '관리자 권한이 필요합니다'
                });
            }

            // 통계 데이터 수집
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

            // 1. 학원 전체 통계
            const [academyStats] = await db.execute(`
                SELECT
                    (SELECT COUNT(*) FROM students WHERE academy_id = ? AND status = 'active') as active_students,
                    (SELECT COUNT(*) FROM students WHERE academy_id = ?) as total_students,
                    (SELECT COUNT(*) FROM teachers WHERE academy_id = ? AND is_active = 1) as active_teachers,
                    (SELECT COUNT(*) FROM classes WHERE academy_id = ? AND status = 'active') as active_classes,
                    (SELECT COUNT(*) FROM users u
                     JOIN user_academy_roles uar ON u.id = uar.user_id
                     WHERE uar.academy_id = ? AND u.is_active = 1) as active_users
            `, [academyId, academyId, academyId, academyId, academyId]);

            // 2. 월간 매출 통계
            const [revenueStats] = await db.execute(`
                SELECT
                    SUM(amount) as total_revenue,
                    COUNT(DISTINCT student_id) as paying_students,
                    AVG(amount) as avg_payment
                FROM payments
                WHERE academy_id = ?
                AND payment_date BETWEEN ? AND ?
                AND status = 'completed'
            `, [academyId, startOfMonth, endOfMonth]);

            // 3. 출석률 통계
            const [attendanceStats] = await db.execute(`
                SELECT
                    COUNT(CASE WHEN status = 'present' THEN 1 END) as present_count,
                    COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_count,
                    COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
                    COUNT(*) as total_records
                FROM attendance
                WHERE academy_id = ?
                AND date BETWEEN ? AND ?
            `, [academyId, startOfMonth, endOfMonth]);

            // 4. 최근 활동 로그
            const [recentActivities] = await db.execute(`
                SELECT
                    al.action,
                    al.entity_type,
                    al.entity_id,
                    al.details,
                    al.created_at,
                    u.name as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.academy_id = ?
                ORDER BY al.created_at DESC
                LIMIT 20
            `, [academyId]);

            // 5. 시스템 상태
            const systemHealth = await this.getSystemHealth();

            // 6. 알림 통계
            const notificationStats = await NotificationService.getNotificationStats(
                academyId,
                startOfMonth,
                endOfMonth
            );

            // 7. 성장 추세 (최근 6개월)
            const growthTrend = await this.getGrowthTrend(academyId);

            // 8. 수업별 통계
            const [classStats] = await db.execute(`
                SELECT
                    c.name as class_name,
                    COUNT(ce.student_id) as enrolled_students,
                    c.capacity,
                    ROUND(COUNT(ce.student_id) * 100.0 / c.capacity, 1) as occupancy_rate
                FROM classes c
                LEFT JOIN class_enrollments ce ON c.id = ce.class_id AND ce.status = 'active'
                WHERE c.academy_id = ? AND c.status = 'active'
                GROUP BY c.id
                ORDER BY occupancy_rate DESC
                LIMIT 10
            `, [academyId]);

            res.render('admin/dashboard', {
                title: '관리자 대시보드',
                user: req.user,
                academyStats: academyStats[0],
                revenueStats: revenueStats[0],
                attendanceStats: attendanceStats[0],
                recentActivities,
                systemHealth,
                notificationStats,
                growthTrend,
                classStats,
                currentMonth: now.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
            });
        } catch (error) {
            console.error('Admin dashboard error:', error);
            res.status(500).json({
                success: false,
                error: '대시보드 로딩 중 오류가 발생했습니다'
            });
        }
    }

    // 사용자 관리
    async getUsers(req, res) {
        try {
            const academyId = req.academyId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT;
            const offset = (page - 1) * limit;
            const search = req.query.search || '';

            let query = `
                SELECT
                    u.id,
                    u.name,
                    u.email,
                    u.phone,
                    u.is_active,
                    u.created_at,
                    u.last_login,
                    uar.role,
                    uar.joined_at
                FROM users u
                JOIN user_academy_roles uar ON u.id = uar.user_id
                WHERE uar.academy_id = ?
            `;
            const params = [academyId];

            if (search) {
                query += ' AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
                const searchPattern = `%${search}%`;
                params.push(searchPattern, searchPattern, searchPattern);
            }

            query += ' ORDER BY uar.joined_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);

            const [users] = await db.execute(query, params);

            // 전체 개수 조회
            const countQuery = `
                SELECT COUNT(*) as total
                FROM users u
                JOIN user_academy_roles uar ON u.id = uar.user_id
                WHERE uar.academy_id = ?
                ${search ? 'AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)' : ''}
            `;
            const countParams = search
                ? [academyId, `%${search}%`, `%${search}%`, `%${search}%`]
                : [academyId];

            const [countResult] = await db.execute(countQuery, countParams);
            const totalCount = countResult[0].total;

            res.render('admin/users', {
                title: '사용자 관리',
                user: req.user,
                users,
                pagination: {
                    page,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit)
                },
                search
            });
        } catch (error) {
            console.error('User management error:', error);
            res.status(500).json({
                success: false,
                error: '사용자 목록 조회 중 오류가 발생했습니다'
            });
        }
    }

    // 사용자 권한 변경
    async updateUserRole(req, res) {
        try {
            const academyId = req.academyId;
            const { userId } = req.params;
            const { role } = req.body;

            // 권한 확인 (owner만 가능)
            const [roleCheck] = await db.execute(
                'SELECT role FROM user_academy_roles WHERE user_id = ? AND academy_id = ?',
                [req.user.id, academyId]
            );

            if (!roleCheck.length || roleCheck[0].role !== 'owner') {
                return res.status(403).json({
                    success: false,
                    error: '학원 소유자만 권한을 변경할 수 있습니다'
                });
            }

            // 권한 업데이트
            await db.execute(
                'UPDATE user_academy_roles SET role = ? WHERE user_id = ? AND academy_id = ?',
                [role, userId, academyId]
            );

            // 감사 로그 기록
            await this.logAuditAction(academyId, req.user.id, 'UPDATE_USER_ROLE', 'user', userId, {
                new_role: role
            });

            res.json({ success: true, message: '권한이 변경되었습니다' });
        } catch (error) {
            console.error('Update user role error:', error);
            res.status(500).json({
                success: false,
                error: '권한 변경 중 오류가 발생했습니다'
            });
        }
    }

    // 시스템 설정
    async getSettings(req, res) {
        try {
            const academyId = req.academyId;

            // 학원 설정 조회
            const [academy] = await db.execute(
                'SELECT * FROM academies WHERE id = ?',
                [academyId]
            );

            // 결제 설정 조회
            const [paymentSettings] = await db.execute(
                'SELECT * FROM academy_settings WHERE academy_id = ? AND category = ?',
                [academyId, 'payment']
            );

            // 알림 설정 조회
            const [notificationSettings] = await db.execute(
                'SELECT * FROM academy_settings WHERE academy_id = ? AND category = ?',
                [academyId, 'notification']
            );

            res.render('admin/settings', {
                title: '시스템 설정',
                user: req.user,
                academy: academy[0],
                paymentSettings: this.parseSettings(paymentSettings),
                notificationSettings: this.parseSettings(notificationSettings)
            });
        } catch (error) {
            console.error('Get settings error:', error);
            res.status(500).json({
                success: false,
                error: '설정 조회 중 오류가 발생했습니다'
            });
        }
    }

    // 설정 업데이트
    async updateSettings(req, res) {
        try {
            const academyId = req.academyId;
            const { category, settings } = req.body;

            // 기존 설정 삭제
            await db.execute(
                'DELETE FROM academy_settings WHERE academy_id = ? AND category = ?',
                [academyId, category]
            );

            // 새 설정 저장
            for (const [key, value] of Object.entries(settings)) {
                await db.execute(
                    'INSERT INTO academy_settings (academy_id, category, setting_key, setting_value) VALUES (?, ?, ?, ?)',
                    [academyId, category, key, JSON.stringify(value)]
                );
            }

            // 감사 로그 기록
            await this.logAuditAction(academyId, req.user.id, 'UPDATE_SETTINGS', 'settings', category, settings);

            res.json({ success: true, message: '설정이 저장되었습니다' });
        } catch (error) {
            console.error('Update settings error:', error);
            res.status(500).json({
                success: false,
                error: '설정 저장 중 오류가 발생했습니다'
            });
        }
    }

    // 감사 로그
    async getAuditLogs(req, res) {
        try {
            const academyId = req.academyId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 50;
            const offset = (page - 1) * limit;
            const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const endDate = req.query.endDate || new Date();

            const [logs] = await db.execute(`
                SELECT
                    al.*,
                    u.name as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.academy_id = ?
                AND al.created_at BETWEEN ? AND ?
                ORDER BY al.created_at DESC
                LIMIT ? OFFSET ?
            `, [academyId, startDate, endDate, limit, offset]);

            // 전체 개수
            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM audit_logs WHERE academy_id = ? AND created_at BETWEEN ? AND ?',
                [academyId, startDate, endDate]
            );

            res.render('admin/audit-logs', {
                title: '감사 로그',
                user: req.user,
                logs,
                pagination: {
                    page,
                    limit,
                    total: countResult[0].total,
                    totalPages: Math.ceil(countResult[0].total / limit)
                },
                dateRange: { startDate, endDate }
            });
        } catch (error) {
            console.error('Get audit logs error:', error);
            res.status(500).json({
                success: false,
                error: '감사 로그 조회 중 오류가 발생했습니다'
            });
        }
    }

    // 백업 관리
    async getBackups(req, res) {
        try {
            const academyId = req.academyId;

            const [backups] = await db.execute(`
                SELECT * FROM academy_backups
                WHERE academy_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            `, [academyId]);

            res.render('admin/backups', {
                title: '백업 관리',
                user: req.user,
                backups
            });
        } catch (error) {
            console.error('Get backups error:', error);
            res.status(500).json({
                success: false,
                error: '백업 목록 조회 중 오류가 발생했습니다'
            });
        }
    }

    // 백업 생성
    async createBackup(req, res) {
        try {
            const academyId = req.academyId;
            const { type = 'manual', description } = req.body;

            // 백업 서비스 호출 (별도 구현 필요)
            const backupService = require('../services/backup.service');
            const backup = await backupService.createBackup(academyId, {
                type,
                description,
                userId: req.user.id
            });

            res.json({
                success: true,
                backup
            });
        } catch (error) {
            console.error('Create backup error:', error);
            res.status(500).json({
                success: false,
                error: '백업 생성 중 오류가 발생했습니다'
            });
        }
    }

    // 보안 대시보드
    async getSecurityDashboard(req, res) {
        try {
            const academyId = req.academyId;

            // 2FA 상태
            const [twoFactorStats] = await db.execute(`
                SELECT
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN tfa.is_enabled = 1 THEN 1 END) as enabled_2fa
                FROM users u
                JOIN user_academy_roles uar ON u.id = uar.user_id
                LEFT JOIN two_factor_auth tfa ON u.id = tfa.user_id
                WHERE uar.academy_id = ?
            `, [academyId]);

            // 최근 로그인 실패
            const [loginFailures] = await db.execute(`
                SELECT
                    lf.*,
                    u.name as user_name
                FROM login_failures lf
                LEFT JOIN users u ON lf.user_id = u.id
                WHERE lf.academy_id = ?
                ORDER BY lf.attempted_at DESC
                LIMIT 20
            `, [academyId]);

            // 보안 이벤트
            const [securityEvents] = await db.execute(`
                SELECT * FROM security_events
                WHERE academy_id = ?
                ORDER BY created_at DESC
                LIMIT 50
            `, [academyId]);

            res.render('admin/security', {
                title: '보안 대시보드',
                user: req.user,
                twoFactorStats: twoFactorStats[0],
                loginFailures,
                securityEvents
            });
        } catch (error) {
            console.error('Security dashboard error:', error);
            res.status(500).json({
                success: false,
                error: '보안 대시보드 로딩 중 오류가 발생했습니다'
            });
        }
    }

    // Helper Methods
    async getSystemHealth() {
        try {
            // 데이터베이스 연결 상태
            const [dbCheck] = await db.execute('SELECT 1');

            // 디스크 공간 (실제 구현 필요)
            const diskSpace = {
                total: 100,
                used: 45,
                free: 55
            };

            // 메모리 사용량
            const memUsage = process.memoryUsage();
            const memoryUsage = {
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
            };

            // API 응답 시간 (최근 100개 요청 평균)
            const avgResponseTime = 45; // ms (실제 구현 필요)

            return {
                database: dbCheck ? 'healthy' : 'unhealthy',
                diskSpace,
                memoryUsage,
                avgResponseTime,
                uptime: process.uptime()
            };
        } catch (error) {
            console.error('System health check error:', error);
            return {
                database: 'error',
                error: error.message
            };
        }
    }

    async getGrowthTrend(academyId) {
        try {
            const months = [];
            const studentCounts = [];
            const revenueCounts = [];

            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

                // 학생 수
                const [students] = await db.execute(
                    'SELECT COUNT(*) as count FROM students WHERE academy_id = ? AND created_at <= ?',
                    [academyId, endOfMonth]
                );

                // 월 매출
                const [revenue] = await db.execute(
                    'SELECT SUM(amount) as total FROM payments WHERE academy_id = ? AND payment_date BETWEEN ? AND ?',
                    [academyId, startOfMonth, endOfMonth]
                );

                months.push(date.toLocaleDateString('ko-KR', { month: 'short' }));
                studentCounts.push(students[0].count);
                revenueCounts.push(revenue[0].total || 0);
            }

            return {
                months,
                students: studentCounts,
                revenue: revenueCounts
            };
        } catch (error) {
            console.error('Growth trend error:', error);
            return { months: [], students: [], revenue: [] };
        }
    }

    parseSettings(settings) {
        const parsed = {};
        for (const setting of settings) {
            try {
                parsed[setting.setting_key] = JSON.parse(setting.setting_value);
            } catch {
                parsed[setting.setting_key] = setting.setting_value;
            }
        }
        return parsed;
    }

    async logAuditAction(academyId, userId, action, entityType, entityId, details) {
        try {
            await db.execute(
                'INSERT INTO audit_logs (academy_id, user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [academyId, userId, action, entityType, entityId, JSON.stringify(details), '127.0.0.1']
            );
        } catch (error) {
            console.error('Audit log error:', error);
        }
    }
}

module.exports = new AdminController();