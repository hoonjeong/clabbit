const db = require('../config/database');
const createLogger = require('../utils/logger');

const logger = createLogger('StudentAttendanceSettingsModel');

/**
 * 학생 출결 설정 모델
 * 출결 번호, 전화번호 뒷자리, 횟수제 설정 관리
 */
class StudentAttendanceSettingsModel {
    /**
     * 학생 출결 설정 생성/업데이트
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @param {Object} data - 설정 데이터
     * @returns {Promise<number>} 생성/수정된 설정 ID
     */
    static async createOrUpdate(academyId, studentId, data) {
        const {
            attendance_code,
            phone_last_4,
            parent_phone_last_4,
            total_sessions = 0,
            remaining_sessions = 0,
            is_session_based = false,
            auto_notification = true
        } = data;

        const query = `
            INSERT INTO student_attendance_settings
            (academy_id, student_id, attendance_code, phone_last_4, parent_phone_last_4,
             total_sessions, remaining_sessions, is_session_based, auto_notification)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            attendance_code = VALUES(attendance_code),
            phone_last_4 = VALUES(phone_last_4),
            parent_phone_last_4 = VALUES(parent_phone_last_4),
            total_sessions = VALUES(total_sessions),
            remaining_sessions = VALUES(remaining_sessions),
            is_session_based = VALUES(is_session_based),
            auto_notification = VALUES(auto_notification),
            updated_at = NOW()
        `;

        const [result] = await db.execute(query, [
            academyId, studentId, attendance_code, phone_last_4, parent_phone_last_4,
            total_sessions, remaining_sessions, is_session_based, auto_notification
        ]);

        logger.info('학생 출결 설정 생성/업데이트', {
            academyId, studentId, attendance_code
        });

        return result.insertId || result.affectedRows;
    }

    /**
     * 학생 출결 설정 조회
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @returns {Promise<Object|null>} 출결 설정
     */
    static async findByStudent(academyId, studentId) {
        const query = `
            SELECT * FROM student_attendance_settings
            WHERE academy_id = ? AND student_id = ?
        `;

        const [rows] = await db.execute(query, [academyId, studentId]);
        return rows[0] || null;
    }

    /**
     * 출결 코드로 학생 찾기
     * @param {number} academyId - 학원 ID
     * @param {string} code - 출결 코드 (전화번호 뒷 4자리 또는 고유 코드)
     * @returns {Promise<Object|null>} 학생 정보
     */
    static async findStudentByCode(academyId, code) {
        const query = `
            SELECT
                sas.*,
                s.id as student_id,
                s.name as student_name,
                s.grade,
                s.student_phone,
                s.parent_phone
            FROM student_attendance_settings sas
            JOIN students s ON sas.student_id = s.id
            WHERE sas.academy_id = ?
                AND s.status = 'active'
                AND (sas.attendance_code = ?
                    OR sas.phone_last_4 = ?
                    OR sas.parent_phone_last_4 = ?)
            LIMIT 1
        `;

        const [rows] = await db.execute(query, [academyId, code, code, code]);
        return rows[0] || null;
    }

    /**
     * 횟수 차감
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @returns {Promise<Object>} 차감 결과
     */
    static async decrementSession(academyId, studentId) {
        // 현재 설정 조회
        const settings = await this.findByStudent(academyId, studentId);

        if (!settings || !settings.is_session_based) {
            return {
                success: false,
                message: '횟수제 학생이 아닙니다'
            };
        }

        if (settings.remaining_sessions <= 0) {
            return {
                success: false,
                message: '남은 수업 횟수가 없습니다',
                remaining: 0
            };
        }

        // 횟수 차감
        const query = `
            UPDATE student_attendance_settings
            SET remaining_sessions = remaining_sessions - 1,
                updated_at = NOW()
            WHERE academy_id = ? AND student_id = ?
                AND is_session_based = TRUE
                AND remaining_sessions > 0
        `;

        const [result] = await db.execute(query, [academyId, studentId]);

        if (result.affectedRows > 0) {
            const newRemaining = settings.remaining_sessions - 1;

            logger.info('횟수 차감', {
                academyId, studentId,
                before: settings.remaining_sessions,
                after: newRemaining
            });

            return {
                success: true,
                message: '수업 횟수가 차감되었습니다',
                remaining: newRemaining
            };
        }

        return {
            success: false,
            message: '횟수 차감에 실패했습니다'
        };
    }

    /**
     * 횟수 증가 (보충/추가)
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @param {number} count - 추가할 횟수
     * @returns {Promise<Object>} 증가 결과
     */
    static async incrementSession(academyId, studentId, count = 1) {
        const query = `
            UPDATE student_attendance_settings
            SET remaining_sessions = remaining_sessions + ?,
                total_sessions = total_sessions + ?,
                updated_at = NOW()
            WHERE academy_id = ? AND student_id = ?
                AND is_session_based = TRUE
        `;

        const [result] = await db.execute(query, [count, count, academyId, studentId]);

        if (result.affectedRows > 0) {
            logger.info('횟수 추가', {
                academyId, studentId, count
            });

            return {
                success: true,
                message: `${count}회가 추가되었습니다`
            };
        }

        return {
            success: false,
            message: '횟수 추가에 실패했습니다'
        };
    }

    /**
     * 횟수 재설정
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @param {number} totalSessions - 총 횟수
     * @param {number} remainingSessions - 남은 횟수
     * @returns {Promise<Object>} 재설정 결과
     */
    static async resetSessions(academyId, studentId, totalSessions, remainingSessions) {
        const query = `
            UPDATE student_attendance_settings
            SET total_sessions = ?,
                remaining_sessions = ?,
                updated_at = NOW()
            WHERE academy_id = ? AND student_id = ?
        `;

        const [result] = await db.execute(query, [
            totalSessions, remainingSessions, academyId, studentId
        ]);

        if (result.affectedRows > 0) {
            logger.info('횟수 재설정', {
                academyId, studentId, totalSessions, remainingSessions
            });

            return {
                success: true,
                message: '수업 횟수가 재설정되었습니다'
            };
        }

        return {
            success: false,
            message: '횟수 재설정에 실패했습니다'
        };
    }

    /**
     * 횟수제 학생 목록 조회
     * @param {number} academyId - 학원 ID
     * @param {Object} filters - 필터 옵션
     * @returns {Promise<Array>} 학생 목록
     */
    static async getSessionBasedStudents(academyId, filters = {}) {
        const {
            low_session_threshold = 5,
            class_id,
            include_expired = false
        } = filters;

        let query = `
            SELECT
                sas.*,
                s.name as student_name,
                s.grade,
                s.student_phone,
                s.parent_phone,
                (sas.remaining_sessions * 100.0 / NULLIF(sas.total_sessions, 0)) as remaining_percentage
            FROM student_attendance_settings sas
            JOIN students s ON sas.student_id = s.id
            WHERE sas.academy_id = ?
                AND s.status = 'active'
                AND sas.is_session_based = TRUE
        `;
        const params = [academyId];

        if (!include_expired) {
            query += ` AND sas.remaining_sessions > 0`;
        }

        // class_id 필터는 students 테이블에 class_id가 없으므로 제거
        // if (class_id) {
        //     query += ` AND s.class_id = ?`;
        //     params.push(class_id);
        // }

        // 낮은 잔여 횟수 필터
        if (low_session_threshold) {
            query += ` AND sas.remaining_sessions <= ?`;
            params.push(low_session_threshold);
        }

        query += ` ORDER BY sas.remaining_sessions ASC, s.name`;

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 고유 출결 코드 생성
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @returns {Promise<string>} 생성된 코드
     */
    static async generateUniqueCode(academyId, studentId) {
        let code;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            // 학원ID + 학생ID + 랜덤 2자리
            const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            code = `${academyId}${studentId.toString().padStart(4, '0')}${random}`;

            // 중복 확인
            const [existing] = await db.execute(
                `SELECT id FROM student_attendance_settings
                 WHERE academy_id = ? AND attendance_code = ?`,
                [academyId, code]
            );

            if (existing.length === 0) {
                return code;
            }

            attempts++;
        } while (attempts < maxAttempts);

        throw new Error('고유 코드 생성에 실패했습니다');
    }

    /**
     * 전체 학생 출결 설정 초기화
     * @param {number} academyId - 학원 ID
     * @returns {Promise<Object>} 초기화 결과
     */
    static async initializeAllStudents(academyId) {
        const query = `
            INSERT INTO student_attendance_settings
            (academy_id, student_id, attendance_code, phone_last_4, parent_phone_last_4)
            SELECT
                s.academy_id,
                s.id,
                CONCAT(s.academy_id, LPAD(s.id, 4, '0')),
                IF(LENGTH(REPLACE(s.student_phone, '-', '')) >= 4,
                   RIGHT(REPLACE(s.student_phone, '-', ''), 4), NULL),
                IF(LENGTH(REPLACE(s.parent_phone, '-', '')) >= 4,
                   RIGHT(REPLACE(s.parent_phone, '-', ''), 4), NULL)
            FROM students s
            WHERE s.academy_id = ?
                AND s.status = 'active'
                AND NOT EXISTS (
                    SELECT 1 FROM student_attendance_settings sas
                    WHERE sas.academy_id = s.academy_id AND sas.student_id = s.id
                )
        `;

        const [result] = await db.execute(query, [academyId]);

        logger.info('출결 설정 일괄 초기화', {
            academyId,
            initialized: result.affectedRows
        });

        return {
            success: true,
            count: result.affectedRows,
            message: `${result.affectedRows}명의 학생 출결 설정이 초기화되었습니다`
        };
    }
}

module.exports = StudentAttendanceSettingsModel;