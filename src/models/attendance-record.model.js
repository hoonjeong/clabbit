const db = require('../config/database');
const createLogger = require('../utils/logger');

const logger = createLogger('AttendanceRecordModel');

/**
 * 출결 기록 모델 (새로운 출결 시스템)
 * 학생의 등원/하원 기록 관리
 */
class AttendanceRecordModel {
    /**
     * 출결 기록 생성
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @param {Object} data - 출결 데이터
     * @returns {Promise<number>} 생성된 출결 기록 ID
     */
    static async create(academyId, studentId, data) {
        const {
            attendance_date = new Date().toISOString().split('T')[0],
            check_in_time,
            check_out_time,
            status = 'present',
            check_in_method = 'kiosk',
            check_out_method,
            notes
        } = data;

        const query = `
            INSERT INTO attendance_records
            (academy_id, student_id, attendance_date, check_in_time, check_out_time,
             status, check_in_method, check_out_method, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            check_in_time = COALESCE(VALUES(check_in_time), check_in_time),
            check_out_time = COALESCE(VALUES(check_out_time), check_out_time),
            status = VALUES(status),
            check_in_method = COALESCE(VALUES(check_in_method), check_in_method),
            check_out_method = COALESCE(VALUES(check_out_method), check_out_method),
            notes = VALUES(notes),
            updated_at = NOW()
        `;

        const [result] = await db.execute(query, [
            academyId, studentId, attendance_date,
            check_in_time || null, check_out_time || null, status,
            check_in_method || null, check_out_method || null, notes || null
        ]);

        logger.info('출결 기록 생성/업데이트', {
            academyId, studentId, attendance_date, status
        });

        return result.insertId || result.affectedRows;
    }

    /**
     * 오늘의 출결 기록 조회
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @returns {Promise<Object|null>} 출결 기록
     */
    static async getTodayRecord(academyId, studentId) {
        const today = new Date().toISOString().split('T')[0];

        const query = `
            SELECT * FROM attendance_records
            WHERE academy_id = ? AND student_id = ? AND attendance_date = ?
        `;

        const [rows] = await db.execute(query, [academyId, studentId, today]);
        return rows[0] || null;
    }

    /**
     * 날짜별 출결 기록 조회
     * @param {number} academyId - 학원 ID
     * @param {string} date - 날짜 (YYYY-MM-DD)
     * @returns {Promise<Array>} 출결 기록 목록
     */
    static async getByDate(academyId, date) {
        const query = `
            SELECT
                ar.*,
                s.name as student_name,
                s.student_phone,
                s.parent_phone
            FROM attendance_records ar
            JOIN students s ON ar.student_id = s.id
            WHERE ar.academy_id = ? AND ar.attendance_date = ?
            ORDER BY ar.check_in_time DESC
        `;

        const [rows] = await db.execute(query, [academyId, date]);
        return rows;
    }

    /**
     * 학생별 출결 기록 조회
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @param {Object} filters - 필터 옵션
     * @returns {Promise<Array>} 출결 기록 목록
     */
    static async getByStudent(academyId, studentId, filters = {}) {
        const {
            start_date,
            end_date,
            status,
            limit = 30,
            offset = 0
        } = filters;

        let query = `
            SELECT * FROM attendance_records
            WHERE academy_id = ? AND student_id = ?
        `;
        const params = [academyId, studentId];

        if (start_date) {
            query += ` AND attendance_date >= ?`;
            params.push(start_date);
        }

        if (end_date) {
            query += ` AND attendance_date <= ?`;
            params.push(end_date);
        }

        if (status) {
            query += ` AND status = ?`;
            params.push(status);
        }

        query += ` ORDER BY attendance_date DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 출결 현황 조회 (필터링)
     * @param {number} academyId - 학원 ID
     * @param {Object} filters - 필터 옵션
     * @returns {Promise<Array>} 출결 기록 목록
     */
    static async getRecords(academyId, filters = {}) {
        const {
            date_start,
            date_end,
            class_id,
            student_name,
            status,
            limit = 50,
            offset = 0
        } = filters;

        let query = `
            SELECT
                ar.*,
                s.name as student_name,
                s.student_phone,
                s.parent_phone,
                u.name as modified_by_name
            FROM attendance_records ar
            JOIN students s ON ar.student_id = s.id
            LEFT JOIN users u ON ar.modified_by = u.id
            WHERE ar.academy_id = ?
        `;
        const params = [academyId];

        if (date_start) {
            query += ` AND ar.attendance_date >= ?`;
            params.push(date_start);
        }

        if (date_end) {
            query += ` AND ar.attendance_date <= ?`;
            params.push(date_end);
        }

        // class_id 필터는 students 테이블에 class_id가 없으므로 제거
        // if (class_id) {
        //     query += ` AND s.class_id = ?`;
        //     params.push(class_id);
        // }

        if (student_name) {
            query += ` AND s.name LIKE ?`;
            params.push(`%${student_name}%`);
        }

        if (status) {
            query += ` AND ar.status = ?`;
            params.push(status);
        }

        query += ` ORDER BY ar.attendance_date DESC, ar.check_in_time DESC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 등원 처리
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @param {string} method - 체크 방법 (kiosk, manual, app)
     * @returns {Promise<Object>} 처리 결과
     */
    static async checkIn(academyId, studentId, method = 'kiosk') {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const checkInTime = now.toISOString().slice(0, 19).replace('T', ' ');

        // 기존 기록 확인
        const existing = await this.getTodayRecord(academyId, studentId);

        if (existing && existing.check_in_time) {
            return {
                success: false,
                message: '이미 등원 처리되었습니다',
                data: existing
            };
        }

        // 등원 기록 생성/업데이트
        await this.create(academyId, studentId, {
            attendance_date: today,
            check_in_time: checkInTime,
            status: 'present',
            check_in_method: method
        });

        return {
            success: true,
            message: '등원 처리 완료',
            check_time: checkInTime
        };
    }

    /**
     * 하원 처리
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @param {string} method - 체크 방법 (kiosk, manual, app)
     * @returns {Promise<Object>} 처리 결과
     */
    static async checkOut(academyId, studentId, method = 'kiosk') {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const checkOutTime = now.toISOString().slice(0, 19).replace('T', ' ');

        // 기존 기록 확인
        const existing = await this.getTodayRecord(academyId, studentId);

        if (!existing || !existing.check_in_time) {
            return {
                success: false,
                message: '등원 기록이 없습니다',
                data: null
            };
        }

        if (existing.check_out_time) {
            return {
                success: false,
                message: '이미 하원 처리되었습니다',
                data: existing
            };
        }

        // 하원 시간 업데이트
        const query = `
            UPDATE attendance_records
            SET check_out_time = ?, check_out_method = ?, updated_at = NOW()
            WHERE academy_id = ? AND student_id = ? AND attendance_date = ?
        `;

        await db.execute(query, [
            checkOutTime, method, academyId, studentId, today
        ]);

        return {
            success: true,
            message: '하원 처리 완료',
            check_time: checkOutTime
        };
    }

    /**
     * 출결 기록 수정
     * @param {number} academyId - 학원 ID
     * @param {number} recordId - 출결 기록 ID
     * @param {Object} data - 수정할 데이터
     * @param {number} userId - 수정자 ID
     * @returns {Promise<number>} 영향받은 행 수
     */
    static async update(academyId, recordId, data, userId) {
        const {
            check_in_time,
            check_out_time,
            status,
            notes
        } = data;

        const query = `
            UPDATE attendance_records
            SET
                check_in_time = COALESCE(?, check_in_time),
                check_out_time = COALESCE(?, check_out_time),
                status = COALESCE(?, status),
                notes = COALESCE(?, notes),
                modified_by = ?,
                modified_at = NOW(),
                updated_at = NOW()
            WHERE id = ? AND academy_id = ?
        `;

        const [result] = await db.execute(query, [
            check_in_time, check_out_time, status, notes,
            userId, recordId, academyId
        ]);

        logger.info('출결 기록 수정', {
            academyId, recordId, modifiedBy: userId
        });

        return result.affectedRows;
    }

    /**
     * 출결 기록 삭제
     * @param {number} academyId - 학원 ID
     * @param {number} recordId - 출결 기록 ID
     * @returns {Promise<number>} 삭제된 행 수
     */
    static async delete(academyId, recordId) {
        const query = `
            DELETE FROM attendance_records
            WHERE id = ? AND academy_id = ?
        `;

        const [result] = await db.execute(query, [recordId, academyId]);

        logger.info('출결 기록 삭제', { academyId, recordId });

        return result.affectedRows;
    }

    /**
     * 출결 통계 조회
     * @param {number} academyId - 학원 ID
     * @param {string} startDate - 시작 날짜
     * @param {string} endDate - 종료 날짜
     * @param {number|null} classId - 반 ID (선택)
     * @returns {Promise<Array>} 통계 데이터
     */
    static async getStatistics(academyId, startDate, endDate, classId = null) {
        let query = `
            SELECT
                ar.attendance_date,
                COUNT(DISTINCT ar.student_id) as total_students,
                SUM(CASE WHEN ar.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN ar.status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN ar.status = 'early_leave' THEN 1 ELSE 0 END) as early_leave_count,
                SUM(CASE WHEN ar.status = 'makeup' THEN 1 ELSE 0 END) as makeup_count
            FROM attendance_records ar
            JOIN students s ON ar.student_id = s.id
            WHERE ar.academy_id = ?
                AND ar.attendance_date BETWEEN ? AND ?
        `;
        const params = [academyId, startDate, endDate];

        // classId 필터는 students 테이블에 class_id가 없으므로 제거
        // if (classId) {
        //     query += ` AND s.class_id = ?`;
        //     params.push(classId);
        // }

        query += ` GROUP BY ar.attendance_date ORDER BY ar.attendance_date`;

        const [rows] = await db.execute(query, params);

        // 출석률 계산
        return rows.map(row => ({
            ...row,
            attendance_rate: row.total_students > 0
                ? ((row.present_count / row.total_students) * 100).toFixed(2)
                : 0
        }));
    }

    /**
     * 오늘의 출결 현황 (대시보드용)
     * @param {number} academyId - 학원 ID
     * @returns {Promise<Object>} 오늘의 출결 현황
     */
    static async getTodayDashboard(academyId) {
        const today = new Date().toISOString().split('T')[0];

        // 전체 학생 수 (active 상태)
        const [totalStudents] = await db.execute(
            `SELECT COUNT(*) as count FROM students
             WHERE academy_id = ? AND status = 'active'`,
            [academyId]
        );

        // 오늘 출결 현황
        const [todayStats] = await db.execute(`
            SELECT
                COUNT(DISTINCT student_id) as checked_in_count,
                COUNT(DISTINCT CASE WHEN check_out_time IS NOT NULL THEN student_id END) as checked_out_count,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_count,
                COUNT(CASE WHEN status = 'early_leave' THEN 1 END) as early_leave_count
            FROM attendance_records
            WHERE academy_id = ? AND attendance_date = ?
        `, [academyId, today]);

        // 최근 등/하원 학생 (10명)
        const [recentRecords] = await db.execute(`
            SELECT
                ar.*,
                s.name as student_name,
                s.grade
            FROM attendance_records ar
            JOIN students s ON ar.student_id = s.id
            WHERE ar.academy_id = ? AND ar.attendance_date = ?
            ORDER BY
                COALESCE(ar.check_out_time, ar.check_in_time) DESC
            LIMIT 10
        `, [academyId, today]);

        return {
            total_students: totalStudents[0].count,
            today: {
                ...todayStats[0],
                not_checked_in: totalStudents[0].count - todayStats[0].checked_in_count
            },
            recent_records: recentRecords
        };
    }
}

module.exports = AttendanceRecordModel;