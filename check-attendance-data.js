const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
    let connection;

    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'clabbit'
        });

        console.log('✅ 데이터베이스 연결 성공\n');

        // 1. 학생 출결 설정 확인
        const [settings] = await connection.query(`
            SELECT sas.*, s.name
            FROM student_attendance_settings sas
            JOIN students s ON sas.student_id = s.id
            WHERE sas.academy_id = 1
        `);

        console.log('📋 학생 출결 설정:');
        settings.forEach(setting => {
            console.log(`   - ${setting.name}: 코드=${setting.attendance_code}, 학생전화=${setting.phone_last_4 || 'N/A'}, 부모전화=${setting.parent_phone_last_4 || 'N/A'}`);
        });

        // 2. 오늘의 출결 기록 확인
        const today = new Date().toISOString().split('T')[0];
        const [records] = await connection.query(`
            SELECT ar.*, s.name
            FROM attendance_records ar
            JOIN students s ON ar.student_id = s.id
            WHERE ar.academy_id = 1 AND ar.attendance_date = ?
        `, [today]);

        console.log(`\n📅 오늘(${today}) 출결 기록:`, records.length ? '' : '없음');
        records.forEach(record => {
            console.log(`   - ${record.name}: 등원=${record.check_in_time || 'N/A'}, 하원=${record.check_out_time || 'N/A'}`);
        });

        // 3. 테스트 가능한 코드 목록
        console.log('\n🔑 테스트 가능한 출결 코드:');
        settings.forEach(setting => {
            const codes = [];
            if (setting.attendance_code) codes.push(setting.attendance_code);
            if (setting.phone_last_4) codes.push(setting.phone_last_4);
            if (setting.parent_phone_last_4) codes.push(setting.parent_phone_last_4);

            if (codes.length > 0) {
                console.log(`   - ${setting.name}: ${codes.join(', ')}`);
            }
        });

    } catch (error) {
        console.error('❌ 오류:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkData();