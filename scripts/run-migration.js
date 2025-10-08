/**
 * 데이터베이스 마이그레이션 실행 스크립트
 * refresh_token 컬럼 추가
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
    let connection;

    try {
        console.log('🔄 데이터베이스 연결 중...');

        // 데이터베이스 연결
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ 데이터베이스 연결 성공');
        console.log('');

        // 1. refresh_token 컬럼 추가
        console.log('📝 Step 1: refresh_token 컬럼 추가...');
        try {
            await connection.query(`
                ALTER TABLE users
                ADD COLUMN refresh_token VARCHAR(500) NULL COMMENT 'Refresh Token (자동로그인용)'
            `);
            console.log('✅ refresh_token 컬럼 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  refresh_token 컬럼이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 2. refresh_token_expires_at 컬럼 추가
        console.log('📝 Step 2: refresh_token_expires_at 컬럼 추가...');
        try {
            await connection.query(`
                ALTER TABLE users
                ADD COLUMN refresh_token_expires_at TIMESTAMP NULL COMMENT 'Refresh Token 만료 시간'
            `);
            console.log('✅ refresh_token_expires_at 컬럼 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  refresh_token_expires_at 컬럼이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 3. last_login_at 컬럼 추가
        console.log('📝 Step 3: last_login_at 컬럼 추가...');
        try {
            await connection.query(`
                ALTER TABLE users
                ADD COLUMN last_login_at TIMESTAMP NULL COMMENT '마지막 로그인 시간'
            `);
            console.log('✅ last_login_at 컬럼 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_FIELDNAME') {
                console.log('⚠️  last_login_at 컬럼이 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 4. 인덱스 추가
        console.log('📝 Step 4: refresh_token 인덱스 추가...');
        try {
            await connection.query(`
                CREATE INDEX idx_refresh_token ON users(refresh_token)
            `);
            console.log('✅ idx_refresh_token 인덱스 추가 완료');
        } catch (error) {
            if (error.code === 'ER_DUP_KEYNAME') {
                console.log('⚠️  idx_refresh_token 인덱스가 이미 존재합니다');
            } else {
                throw error;
            }
        }

        // 5. 현재 users 테이블 구조 확인
        console.log('');
        console.log('📊 users 테이블 구조:');
        const [columns] = await connection.query(`
            SHOW COLUMNS FROM users
        `);

        console.table(columns.map(col => ({
            Field: col.Field,
            Type: col.Type,
            Null: col.Null,
            Key: col.Key,
            Default: col.Default
        })));

        // 6. 사용자 수 확인
        const [result] = await connection.query(`
            SELECT COUNT(*) as total FROM users
        `);
        console.log('');
        console.log(`✅ 총 사용자 수: ${result[0].total}명`);

        console.log('');
        console.log('🎉 마이그레이션 완료!');

    } catch (error) {
        console.error('');
        console.error('❌ 마이그레이션 오류:', error.message);
        console.error('');
        console.error('상세 오류:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('');
            console.log('🔌 데이터베이스 연결 종료');
        }
    }
}

// 스크립트 실행
runMigration();
