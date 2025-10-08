const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    let connection;

    try {
        // 데이터베이스 연결
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'clabbit',
            multipleStatements: true
        });

        console.log('📊 데이터베이스에 연결되었습니다.');

        // SQL 파일 읽기
        const schemaPath = path.join(__dirname, 'database', 'communications-schema.sql');
        const schema = await fs.readFile(schemaPath, 'utf8');

        // 스키마 실행
        console.log('🔨 소통 및 수업 관리 테이블 생성 중...');

        // SQL 문을 세미콜론으로 분리하여 각각 실행
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (statement.startsWith('--') || statement.length === 0) continue;

            try {
                await connection.execute(statement);

                // 테이블 이름 추출 시도
                const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i);
                if (tableMatch) {
                    console.log(`   ✅ 테이블 생성: ${tableMatch[1]}`);
                }
            } catch (error) {
                if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                    const tableMatch = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i);
                    if (tableMatch) {
                        console.log(`   ⏭️  테이블 이미 존재: ${tableMatch[1]}`);
                    }
                } else {
                    console.error(`   ❌ 오류 발생:`, error.message);
                }
            }
        }

        console.log('\n✅ 소통 및 수업 관리 데이터베이스 설정이 완료되었습니다!');

        // 생성된 테이블 확인
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = ?
            AND (
                TABLE_NAME LIKE '%announcement%'
                OR TABLE_NAME LIKE '%message%'
                OR TABLE_NAME LIKE '%conversation%'
                OR TABLE_NAME LIKE '%notification%'
                OR TABLE_NAME LIKE '%schedule%'
                OR TABLE_NAME LIKE '%material%'
                OR TABLE_NAME LIKE '%assignment%'
                OR TABLE_NAME LIKE '%attachment%'
                OR TABLE_NAME LIKE '%session%'
            )
            ORDER BY TABLE_NAME
        `, [process.env.DB_NAME || 'clabbit']);

        console.log('\n📋 생성된 테이블 목록:');
        tables.forEach(table => {
            console.log(`   - ${table.TABLE_NAME}`);
        });

        console.log('\n🎉 모든 설정이 완료되었습니다!');
        console.log('   소통 및 수업 관리 모듈을 사용할 준비가 되었습니다.');

    } catch (error) {
        console.error('❌ 데이터베이스 설정 중 오류가 발생했습니다:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// 스크립트 실행
setupDatabase();