const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupAttendanceTables() {
    let connection;

    try {
        // 데이터베이스 연결
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'clabbit',
            multipleStatements: true
        });

        console.log('✅ 데이터베이스 연결 성공');

        // SQL 파일 읽기
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create-attendance-tables.sql');
        const sqlContent = await fs.readFile(sqlPath, 'utf8');

        // DELIMITER를 사용하지 않는 버전으로 변환
        // 트리거 부분을 개별적으로 실행
        const statements = sqlContent.split('DELIMITER');

        // 테이블 생성 부분만 먼저 실행
        const tableStatements = statements[0];
        await connection.query(tableStatements);
        console.log('✅ 출결 테이블 생성 완료');

        // 트리거는 수동으로 생성 (DELIMITER 없이)
        // 기본 출결 설정 트리거
        const createDefaultSettingsTrigger = `
            CREATE TRIGGER IF NOT EXISTS create_default_attendance_settings
            AFTER INSERT ON academies
            FOR EACH ROW
            BEGIN
                INSERT INTO academy_attendance_settings (
                    academy_id,
                    enable_notifications,
                    notification_methods,
                    check_in_message_template,
                    check_out_message_template
                ) VALUES (
                    NEW.id,
                    TRUE,
                    '["sms"]',
                    '[{academy_name}] {student_name}님이 {time}에 등원하였습니다.',
                    '[{academy_name}] {student_name}님이 {time}에 하원하였습니다.'
                );
            END`;

        // 학생 출결 설정 트리거
        const createStudentSettingsTrigger = `
            CREATE TRIGGER IF NOT EXISTS create_student_attendance_settings
            AFTER INSERT ON students
            FOR EACH ROW
            BEGIN
                DECLARE phone_last VARCHAR(4);
                DECLARE parent_phone_last VARCHAR(4);
                DECLARE code VARCHAR(10);

                SET phone_last = IF(NEW.student_phone IS NOT NULL AND LENGTH(NEW.student_phone) >= 4,
                                    RIGHT(REPLACE(NEW.student_phone, '-', ''), 4),
                                    NULL);
                SET parent_phone_last = IF(NEW.parent_phone IS NOT NULL AND LENGTH(NEW.parent_phone) >= 4,
                                           RIGHT(REPLACE(NEW.parent_phone, '-', ''), 4),
                                           NULL);
                SET code = CONCAT(NEW.academy_id, LPAD(NEW.id, 4, '0'));

                INSERT INTO student_attendance_settings (
                    academy_id,
                    student_id,
                    attendance_code,
                    phone_last_4,
                    parent_phone_last_4
                ) VALUES (
                    NEW.academy_id,
                    NEW.id,
                    code,
                    phone_last,
                    parent_phone_last
                ) ON DUPLICATE KEY UPDATE
                    phone_last_4 = VALUES(phone_last_4),
                    parent_phone_last_4 = VALUES(parent_phone_last_4);
            END`;

        // 학생 정보 업데이트 트리거
        const updateStudentSettingsTrigger = `
            CREATE TRIGGER IF NOT EXISTS update_student_attendance_settings
            AFTER UPDATE ON students
            FOR EACH ROW
            BEGIN
                DECLARE phone_last VARCHAR(4);
                DECLARE parent_phone_last VARCHAR(4);

                SET phone_last = IF(NEW.student_phone IS NOT NULL AND LENGTH(NEW.student_phone) >= 4,
                                    RIGHT(REPLACE(NEW.student_phone, '-', ''), 4),
                                    NULL);
                SET parent_phone_last = IF(NEW.parent_phone IS NOT NULL AND LENGTH(NEW.parent_phone) >= 4,
                                           RIGHT(REPLACE(NEW.parent_phone, '-', ''), 4),
                                           NULL);

                UPDATE student_attendance_settings
                SET phone_last_4 = phone_last,
                    parent_phone_last_4 = parent_phone_last,
                    updated_at = NOW()
                WHERE student_id = NEW.id AND academy_id = NEW.academy_id;
            END`;

        // 트리거 생성 시도
        try {
            await connection.query('DROP TRIGGER IF EXISTS create_default_attendance_settings');
            await connection.query(createDefaultSettingsTrigger);
            console.log('✅ 학원 기본 설정 트리거 생성 완료');
        } catch (err) {
            console.log('⚠️ 학원 기본 설정 트리거 생성 실패 (이미 존재할 수 있음):', err.message);
        }

        try {
            await connection.query('DROP TRIGGER IF EXISTS create_student_attendance_settings');
            await connection.query(createStudentSettingsTrigger);
            console.log('✅ 학생 출결 설정 트리거 생성 완료');
        } catch (err) {
            console.log('⚠️ 학생 출결 설정 트리거 생성 실패 (이미 존재할 수 있음):', err.message);
        }

        try {
            await connection.query('DROP TRIGGER IF EXISTS update_student_attendance_settings');
            await connection.query(updateStudentSettingsTrigger);
            console.log('✅ 학생 정보 업데이트 트리거 생성 완료');
        } catch (err) {
            console.log('⚠️ 학생 정보 업데이트 트리거 생성 실패 (이미 존재할 수 있음):', err.message);
        }

        // 기존 학생들에 대한 출결 설정 초기화
        const [students] = await connection.query('SELECT COUNT(*) as count FROM students WHERE status = "active"');
        if (students[0].count > 0) {
            const initResult = await connection.query(`
                INSERT IGNORE INTO student_attendance_settings
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
                WHERE s.status = 'active'
                    AND NOT EXISTS (
                        SELECT 1 FROM student_attendance_settings sas
                        WHERE sas.academy_id = s.academy_id AND sas.student_id = s.id
                    )
            `);
            console.log(`✅ ${initResult[0].affectedRows}명의 기존 학생 출결 설정 초기화 완료`);
        }

        // 기존 학원들에 대한 기본 설정 초기화
        const [academies] = await connection.query('SELECT COUNT(*) as count FROM academies');
        if (academies[0].count > 0) {
            const academyResult = await connection.query(`
                INSERT IGNORE INTO academy_attendance_settings
                (academy_id, enable_notifications, notification_methods,
                 check_in_message_template, check_out_message_template)
                SELECT
                    a.id,
                    TRUE,
                    '["sms"]',
                    '[{academy_name}] {student_name}님이 {time}에 등원하였습니다.',
                    '[{academy_name}] {student_name}님이 {time}에 하원하였습니다.'
                FROM academies a
                WHERE NOT EXISTS (
                    SELECT 1 FROM academy_attendance_settings aas
                    WHERE aas.academy_id = a.id
                )
            `);
            console.log(`✅ ${academyResult[0].affectedRows}개 학원 기본 설정 초기화 완료`);
        }

        console.log('\n✅ 출결 관리 시스템 테이블 설정이 완료되었습니다!');

    } catch (error) {
        console.error('❌ 오류 발생:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupAttendanceTables();