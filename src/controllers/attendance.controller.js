const AttendanceRecordModel = require('../models/attendance-record.model');
const StudentAttendanceSettingsModel = require('../models/student-attendance-settings.model');
const StudentModel = require('../models/student.model');
const ClassModel = require('../models/class.model');
const db = require('../config/database');
const createLogger = require('../utils/logger');

const logger = createLogger('AttendanceController');

/**
 * 출결 관리 컨트롤러 (새로운 시스템)
 */
class AttendanceController {
    /**
     * 등원 처리 (키오스크)
     */
    static async checkIn(req, res) {
        try {
            const academyId = req.academyId || req.body.academyId || 1; // 키오스크는 academyId를 body로 받음, 기본값 1
            const { code, method = 'kiosk' } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: '출결 코드를 입력해주세요'
                });
            }

            if (!academyId) {
                return res.status(400).json({
                    success: false,
                    error: '학원 정보가 필요합니다'
                });
            }

            // 학생 찾기
            console.log('Finding student with academyId:', academyId, 'code:', code);
            const student = await StudentAttendanceSettingsModel.findStudentByCode(academyId, code);
            if (!student) {
                logger.error('학생을 찾을 수 없음', { academyId, code });
                return res.status(404).json({
                    success: false,
                    error: '등록되지 않은 코드입니다'
                });
            }
            console.log('Found student:', student);

            // 등원 처리
            console.log('Processing check-in for student_id:', student.student_id);
            const result = await AttendanceRecordModel.checkIn(academyId, student.student_id, method);

            // 횟수제 학생인 경우 횟수 차감
            if (result.success && student.is_session_based) {
                const sessionResult = await StudentAttendanceSettingsModel.decrementSession(
                    academyId,
                    student.student_id
                );
                result.remaining_sessions = sessionResult.remaining;
            }

            return res.json({
                ...result,
                student_name: student.student_name,
                is_session_based: student.is_session_based,
                remaining_sessions: student.is_session_based ? student.remaining_sessions - 1 : null
            });
        } catch (error) {
            logger.error('등원 처리 오류', error);
            console.error('등원 처리 오류:', error);
            return res.status(500).json({
                success: false,
                error: '등원 처리 중 오류가 발생했습니다',
                detail: error.message
            });
        }
    }

    /**
     * 하원 처리 (키오스크)
     */
    static async checkOut(req, res) {
        try {
            const academyId = req.academyId || req.body.academyId || 1;
            const { code, method = 'kiosk' } = req.body;

            if (!code) {
                return res.status(400).json({
                    success: false,
                    error: '출결 코드를 입력해주세요'
                });
            }

            // 학생 찾기
            const student = await StudentAttendanceSettingsModel.findStudentByCode(academyId, code);
            if (!student) {
                return res.status(404).json({
                    success: false,
                    error: '등록되지 않은 코드입니다'
                });
            }

            // 하원 처리
            const result = await AttendanceRecordModel.checkOut(academyId, student.student_id, method);

            return res.json({
                ...result,
                student_name: student.student_name
            });
        } catch (error) {
            logger.error('하원 처리 오류', error);
            return res.status(500).json({
                success: false,
                error: '하원 처리 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 오늘의 대시보드 데이터
     */
    static async getTodayDashboard(req, res) {
        try {
            const academyId = req.academyId;
            const dashboard = await AttendanceRecordModel.getTodayDashboard(academyId);

            return res.json({
                success: true,
                data: dashboard
            });
        } catch (error) {
            logger.error('대시보드 조회 오류', error);
            return res.status(500).json({
                success: false,
                error: '대시보드 데이터 조회 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 출결 기록 조회
     */
    static async getRecords(req, res) {
        try {
            const academyId = req.academyId;
            const filters = {
                date_start: req.query.date_start,
                date_end: req.query.date_end,
                class_id: req.query.class_id,
                student_name: req.query.student_name,
                status: req.query.status,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };

            const records = await AttendanceRecordModel.getRecords(academyId, filters);

            // 통계 계산
            const stats = {
                total: 0,
                present: 0,
                absent: 0,
                late: 0,
                early_leave: 0,
                makeup: 0
            };

            // 날짜 범위의 전체 학생 수 조회
            if (filters.date_start && filters.date_end) {
                const studentCount = await StudentModel.countActive(academyId, filters.class_id);
                stats.total = studentCount;
            }

            // 기록에서 통계 계산
            records.forEach(record => {
                if (record.status === 'present') stats.present++;
                else if (record.status === 'absent') stats.absent++;
                else if (record.status === 'late') stats.late++;
                else if (record.status === 'early_leave') stats.early_leave++;
                else if (record.status === 'makeup') stats.makeup++;
            });

            return res.json({
                success: true,
                data: records,
                stats: stats,
                total: records.length // 페이지네이션용
            });
        } catch (error) {
            logger.error('출결 기록 조회 오류', error);
            return res.status(500).json({
                success: false,
                error: '출결 기록 조회 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 날짜별 출결 기록 조회
     */
    static async getRecordsByDate(req, res) {
        try {
            const academyId = req.academyId;
            const { date } = req.params;

            if (!date) {
                return res.status(400).json({
                    success: false,
                    error: '날짜를 지정해주세요'
                });
            }

            const records = await AttendanceRecordModel.getByDate(academyId, date);

            return res.json({
                success: true,
                data: records
            });
        } catch (error) {
            logger.error('날짜별 출결 조회 오류', error);
            return res.status(500).json({
                success: false,
                error: '출결 기록 조회 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 수동 출결 기록 생성
     */
    static async createManualRecord(req, res) {
        try {
            const academyId = req.academyId;
            const { student_id, attendance_date, status, check_in_time, check_out_time, notes } = req.body;

            if (!student_id || !attendance_date || !status) {
                return res.status(400).json({
                    success: false,
                    error: '필수 정보를 입력해주세요'
                });
            }

            const recordId = await AttendanceRecordModel.create(academyId, student_id, {
                attendance_date,
                status,
                check_in_time,
                check_out_time,
                check_in_method: 'manual',
                check_out_method: check_out_time ? 'manual' : null,
                notes
            });

            return res.json({
                success: true,
                message: '출결 기록이 생성되었습니다',
                id: recordId
            });
        } catch (error) {
            logger.error('수동 출결 생성 오류', error);
            return res.status(500).json({
                success: false,
                error: '출결 기록 생성 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 출결 기록 수정
     */
    static async updateRecord(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;
            const userId = req.user.id;
            const data = req.body;

            const affected = await AttendanceRecordModel.update(academyId, id, data, userId);

            if (affected === 0) {
                return res.status(404).json({
                    success: false,
                    error: '출결 기록을 찾을 수 없습니다'
                });
            }

            return res.json({
                success: true,
                message: '출결 기록이 수정되었습니다'
            });
        } catch (error) {
            logger.error('출결 수정 오류', error);
            return res.status(500).json({
                success: false,
                error: '출결 기록 수정 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 출결 기록 삭제
     */
    static async deleteRecord(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;

            const affected = await AttendanceRecordModel.delete(academyId, id);

            if (affected === 0) {
                return res.status(404).json({
                    success: false,
                    error: '출결 기록을 찾을 수 없습니다'
                });
            }

            return res.json({
                success: true,
                message: '출결 기록이 삭제되었습니다'
            });
        } catch (error) {
            logger.error('출결 삭제 오류', error);
            return res.status(500).json({
                success: false,
                error: '출결 기록 삭제 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 학생별 출결 기록 조회
     */
    static async getStudentRecords(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;
            const filters = {
                start_date: req.query.start_date,
                end_date: req.query.end_date,
                status: req.query.status,
                limit: parseInt(req.query.limit) || 30,
                offset: parseInt(req.query.offset) || 0
            };

            const records = await AttendanceRecordModel.getByStudent(academyId, studentId, filters);

            return res.json({
                success: true,
                data: records
            });
        } catch (error) {
            logger.error('학생별 출결 조회 오류', error);
            return res.status(500).json({
                success: false,
                error: '학생 출결 기록 조회 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 출결 통계 조회
     */
    static async getStatistics(req, res) {
        try {
            const academyId = req.academyId;
            const { start_date, end_date, class_id } = req.query;

            if (!start_date || !end_date) {
                return res.status(400).json({
                    success: false,
                    error: '조회 기간을 지정해주세요'
                });
            }

            const statistics = await AttendanceRecordModel.getStatistics(
                academyId,
                start_date,
                end_date,
                class_id
            );

            return res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            logger.error('통계 조회 오류', error);
            return res.status(500).json({
                success: false,
                error: '통계 조회 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 횟수제 학생 목록 조회
     */
    static async getSessionBasedStudents(req, res) {
        try {
            const academyId = req.academyId;
            const filters = {
                low_session_threshold: parseInt(req.query.threshold) || 5,
                class_id: req.query.class_id,
                include_expired: req.query.include_expired === 'true'
            };

            const students = await StudentAttendanceSettingsModel.getSessionBasedStudents(academyId, filters);

            return res.json({
                success: true,
                data: students
            });
        } catch (error) {
            logger.error('횟수제 학생 조회 오류', error);
            return res.status(500).json({
                success: false,
                error: '횟수제 학생 조회 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 학생 횟수 조정
     */
    static async adjustStudentSessions(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;
            const { total_sessions, remaining_sessions } = req.body;

            const result = await StudentAttendanceSettingsModel.resetSessions(
                academyId,
                studentId,
                total_sessions,
                remaining_sessions
            );

            return res.json(result);
        } catch (error) {
            logger.error('횟수 조정 오류', error);
            return res.status(500).json({
                success: false,
                error: '횟수 조정 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 학생 횟수 추가
     */
    static async addStudentSessions(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;
            const { count } = req.body;

            const result = await StudentAttendanceSettingsModel.incrementSession(
                academyId,
                studentId,
                count || 1
            );

            return res.json(result);
        } catch (error) {
            logger.error('횟수 추가 오류', error);
            return res.status(500).json({
                success: false,
                error: '횟수 추가 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 출결 설정 초기화
     */
    static async initializeSettings(req, res) {
        try {
            const academyId = req.academyId;
            const result = await StudentAttendanceSettingsModel.initializeAllStudents(academyId);

            return res.json(result);
        } catch (error) {
            logger.error('설정 초기화 오류', error);
            return res.status(500).json({
                success: false,
                error: '출결 설정 초기화 중 오류가 발생했습니다'
            });
        }
    }

    /**
     * 보강 수업 목록 조회
     */
    static async getMakeupClasses(req, res) {
        try {
            const academyId = req.academyId;
            const { date_start, date_end, status } = req.query;

            let query = `
                SELECT
                    mc.*,
                    s.name as student_name,
                    s.phone as student_phone,
                    ar_original.attendance_date as original_date
                FROM makeup_classes mc
                JOIN students s ON mc.student_id = s.id AND s.academy_id = mc.academy_id
                LEFT JOIN attendance_records ar_original ON mc.original_attendance_id = ar_original.id
                WHERE mc.academy_id = ?
            `;
            const params = [academyId];

            if (date_start && date_end) {
                query += ' AND mc.scheduled_date BETWEEN ? AND ?';
                params.push(date_start, date_end);
            }

            if (status) {
                query += ' AND mc.status = ?';
                params.push(status);
            }

            query += ' ORDER BY mc.scheduled_date DESC, mc.scheduled_time DESC';

            const [rows] = await db.execute(query, params);

            res.json({
                success: true,
                data: rows
            });
        } catch (error) {
            console.error('보강 수업 조회 오류:', error);
            res.status(500).json({
                success: false,
                message: '보강 수업 조회에 실패했습니다.'
            });
        }
    }

    /**
     * 보강 수업 등록
     */
    static async createMakeupClass(req, res) {
        try {
            const academyId = req.academyId;
            const {
                student_id,
                original_attendance_id,
                scheduled_date,
                scheduled_time,
                reason,
                notes
            } = req.body;

            const query = `
                INSERT INTO makeup_classes
                (academy_id, student_id, original_attendance_id, scheduled_date, scheduled_time, reason, notes, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
            `;

            const [result] = await db.execute(query, [
                academyId,
                student_id,
                original_attendance_id || null,
                scheduled_date,
                scheduled_time || null,
                reason || null,
                notes || null
            ]);

            res.json({
                success: true,
                data: {
                    id: result.insertId,
                    student_id,
                    scheduled_date,
                    status: 'pending'
                }
            });
        } catch (error) {
            console.error('보강 수업 등록 오류:', error);
            res.status(500).json({
                success: false,
                message: '보강 수업 등록에 실패했습니다.'
            });
        }
    }

    /**
     * 보강 수업 수정
     */
    static async updateMakeupClass(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;
            const {
                scheduled_date,
                scheduled_time,
                status,
                reason,
                notes
            } = req.body;

            const query = `
                UPDATE makeup_classes
                SET scheduled_date = ?, scheduled_time = ?, status = ?, reason = ?, notes = ?
                WHERE id = ? AND academy_id = ?
            `;

            const [result] = await db.execute(query, [
                scheduled_date,
                scheduled_time || null,
                status,
                reason || null,
                notes || null,
                id,
                academyId
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '보강 수업을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '보강 수업이 수정되었습니다.'
            });
        } catch (error) {
            console.error('보강 수업 수정 오류:', error);
            res.status(500).json({
                success: false,
                message: '보강 수업 수정에 실패했습니다.'
            });
        }
    }

    /**
     * 보강 수업 삭제
     */
    static async deleteMakeupClass(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;

            const query = 'DELETE FROM makeup_classes WHERE id = ? AND academy_id = ?';
            const [result] = await db.execute(query, [id, academyId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '보강 수업을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '보강 수업이 삭제되었습니다.'
            });
        } catch (error) {
            console.error('보강 수업 삭제 오류:', error);
            res.status(500).json({
                success: false,
                message: '보강 수업 삭제에 실패했습니다.'
            });
        }
    }

    /**
     * 보강 수업 완료 처리
     */
    static async completeMakeupClass(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;
            const { attendance_time } = req.body;

            // 보강 수업 상태 업데이트
            const updateQuery = `
                UPDATE makeup_classes
                SET status = 'completed', actual_attendance_time = ?
                WHERE id = ? AND academy_id = ?
            `;

            const [result] = await db.execute(updateQuery, [
                attendance_time || new Date(),
                id,
                academyId
            ]);

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: '보강 수업을 찾을 수 없습니다.'
                });
            }

            // 보강 수업 정보 조회
            const [makeupClass] = await db.execute(
                'SELECT * FROM makeup_classes WHERE id = ?',
                [id]
            );

            // 출결 기록 생성
            const attendanceQuery = `
                INSERT INTO attendance_records
                (academy_id, student_id, attendance_date, check_in_time, status, notes)
                VALUES (?, ?, ?, ?, 'makeup', ?)
            `;

            await db.execute(attendanceQuery, [
                academyId,
                makeupClass[0].student_id,
                makeupClass[0].scheduled_date,
                attendance_time || new Date(),
                `보강 수업 완료 - ${makeupClass[0].reason || ''}`
            ]);

            res.json({
                success: true,
                message: '보강 수업이 완료 처리되었습니다.'
            });
        } catch (error) {
            console.error('보강 수업 완료 처리 오류:', error);
            res.status(500).json({
                success: false,
                message: '보강 수업 완료 처리에 실패했습니다.'
            });
        }
    }

    /**
     * 상세 통계 데이터 조회
     */
    static async getDetailedStatistics(req, res) {
        try {
            const academyId = req.academyId;
            const { period, start_date, end_date } = req.query;

            // 기간 설정
            let dateCondition = '';
            const params = [academyId];

            if (start_date && end_date) {
                dateCondition = 'AND attendance_date BETWEEN ? AND ?';
                params.push(start_date, end_date);
            } else if (period === 'week') {
                dateCondition = 'AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
            } else if (period === 'month') {
                dateCondition = 'AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
            } else if (period === 'year') {
                dateCondition = 'AND attendance_date >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)';
            } else {
                // 기본값: 이번 달
                dateCondition = 'AND MONTH(attendance_date) = MONTH(CURDATE()) AND YEAR(attendance_date) = YEAR(CURDATE())';
            }

            // 1. 일별 출결 통계
            const dailyQuery = `
                SELECT
                    attendance_date,
                    COUNT(DISTINCT student_id) as total_students,
                    SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent,
                    SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late,
                    SUM(CASE WHEN status = 'early_leave' THEN 1 ELSE 0 END) as early_leave,
                    SUM(CASE WHEN status = 'makeup' THEN 1 ELSE 0 END) as makeup
                FROM attendance_records
                WHERE academy_id = ? ${dateCondition}
                GROUP BY attendance_date
                ORDER BY attendance_date DESC
            `;

            const [dailyStats] = await db.execute(dailyQuery, params);

            // 2. 학생별 출석률
            const studentQuery = `
                SELECT
                    s.id,
                    s.name,
                    COUNT(ar.id) as total_days,
                    SUM(CASE WHEN ar.status IN ('present', 'late', 'makeup') THEN 1 ELSE 0 END) as attended_days,
                    ROUND(SUM(CASE WHEN ar.status IN ('present', 'late', 'makeup') THEN 1 ELSE 0 END) * 100.0 / COUNT(ar.id), 1) as attendance_rate
                FROM students s
                LEFT JOIN attendance_records ar ON s.id = ar.student_id AND ar.academy_id = ? ${dateCondition}
                WHERE s.academy_id = ? AND s.status = 'active'
                GROUP BY s.id, s.name
                ORDER BY attendance_rate ASC
                LIMIT 20
            `;

            const studentParams = [academyId, ...params.slice(1), academyId];
            const [studentStats] = await db.execute(studentQuery, studentParams);

            // 3. 시간대별 통계
            const hourlyQuery = `
                SELECT
                    HOUR(check_in_time) as hour,
                    COUNT(*) as count
                FROM attendance_records
                WHERE academy_id = ? AND check_in_time IS NOT NULL ${dateCondition}
                GROUP BY HOUR(check_in_time)
                ORDER BY hour
            `;

            const [hourlyStats] = await db.execute(hourlyQuery, params);

            // 4. 요일별 통계
            const weekdayQuery = `
                SELECT
                    DAYNAME(attendance_date) as weekday,
                    DAYOFWEEK(attendance_date) as day_num,
                    COUNT(*) as total,
                    AVG(CASE WHEN status IN ('present', 'late', 'makeup') THEN 1 ELSE 0 END) * 100 as avg_attendance_rate
                FROM attendance_records
                WHERE academy_id = ? ${dateCondition}
                GROUP BY weekday, day_num
                ORDER BY day_num
            `;

            const [weekdayStats] = await db.execute(weekdayQuery, params);

            // 5. 전체 요약 통계
            const summaryQuery = `
                SELECT
                    COUNT(DISTINCT student_id) as unique_students,
                    COUNT(*) as total_records,
                    AVG(CASE WHEN status IN ('present', 'late', 'makeup') THEN 1 ELSE 0 END) * 100 as overall_attendance_rate,
                    SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as total_absences,
                    SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as total_lates
                FROM attendance_records
                WHERE academy_id = ? ${dateCondition}
            `;

            const [summary] = await db.execute(summaryQuery, params);

            res.json({
                success: true,
                data: {
                    summary: summary[0],
                    daily: dailyStats,
                    students: studentStats,
                    hourly: hourlyStats,
                    weekday: weekdayStats
                }
            });
        } catch (error) {
            console.error('통계 조회 오류:', error);
            res.status(500).json({
                success: false,
                message: '통계 조회에 실패했습니다.'
            });
        }
    }

    /**
     * 출결 리포트 생성 (Excel)
     */
    static async generateReport(req, res) {
        try {
            const academyId = req.academyId;
            const { month, year } = req.query;

            const targetYear = year || new Date().getFullYear();
            const targetMonth = month || new Date().getMonth() + 1;

            // 출결 데이터 조회
            const query = `
                SELECT
                    s.name as student_name,
                    s.phone as student_phone,
                    ar.attendance_date,
                    ar.check_in_time,
                    ar.check_out_time,
                    ar.status,
                    ar.notes
                FROM attendance_records ar
                JOIN students s ON ar.student_id = s.id
                WHERE ar.academy_id = ?
                    AND YEAR(ar.attendance_date) = ?
                    AND MONTH(ar.attendance_date) = ?
                ORDER BY s.name, ar.attendance_date
            `;

            const [records] = await db.execute(query, [academyId, targetYear, targetMonth]);

            // Excel 파일 생성을 위한 데이터 준비
            const reportData = {
                title: `${targetYear}년 ${targetMonth}월 출결 리포트`,
                records: records,
                generated_at: new Date().toISOString()
            };

            res.json({
                success: true,
                data: reportData
            });
        } catch (error) {
            console.error('리포트 생성 오류:', error);
            res.status(500).json({
                success: false,
                message: '리포트 생성에 실패했습니다.'
            });
        }
    }
}

module.exports = AttendanceController;