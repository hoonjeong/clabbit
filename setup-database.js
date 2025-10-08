const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
    let connection;

    try {
        // 먼저 데이터베이스 없이 연결
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD
        });

        console.log('데이터베이스 서버에 연결되었습니다.');

        // 데이터베이스 생성
        await connection.query('CREATE DATABASE IF NOT EXISTS clabbit DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
        console.log('데이터베이스 "clabbit" 생성 완료');

        // 데이터베이스 선택
        await connection.query('USE clabbit');

        // 회원 테이블 생성
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                academy_name VARCHAR(100) NOT NULL COMMENT '학원명',
                owner_name VARCHAR(50) NOT NULL COMMENT '원장님 성함',
                email VARCHAR(100) NOT NULL UNIQUE COMMENT '이메일',
                phone VARCHAR(20) NOT NULL COMMENT '연락처',
                password VARCHAR(40) NOT NULL COMMENT '비밀번호 (SHA1)',
                agree_terms BOOLEAN DEFAULT TRUE COMMENT '이용약관 동의',
                agree_marketing BOOLEAN DEFAULT FALSE COMMENT '마케팅 정보 수신 동의',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
                INDEX idx_email (email),
                INDEX idx_phone (phone),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원 정보'
        `);
        console.log('테이블 "users" 생성 완료');

        console.log('\n✅ 데이터베이스 설정이 완료되었습니다!');

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

setupDatabase();
