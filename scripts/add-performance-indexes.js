/**
 * 성능 향상을 위한 인덱스 추가 스크립트
 * 데이터베이스 쿼리 성능을 개선하기 위한 인덱스를 생성합니다.
 */

require('dotenv').config();
const db = require('../src/config/database');
const fs = require('fs').promises;
const path = require('path');

async function addPerformanceIndexes() {
    const connection = await db.getConnection();

    try {
        console.log('🚀 성능 인덱스 추가 시작...\n');

        // SQL 파일 읽기
        const sqlFile = path.join(__dirname, '..', 'database', 'migrations', 'add-performance-indexes.sql');
        const sqlContent = await fs.readFile(sqlFile, 'utf8');

        // SQL 문을 개별 명령으로 분리 (세미콜론 기준)
        const statements = sqlContent
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt =>
                stmt.length > 0 &&
                !stmt.startsWith('--') &&
                !stmt.toUpperCase().startsWith('USE') &&
                !stmt.toUpperCase().startsWith('SELECT')
            );

        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            if (statement.toUpperCase().startsWith('CREATE INDEX')) {
                try {
                    // 인덱스 이름 추출
                    const indexMatch = statement.match(/CREATE INDEX (?:IF NOT EXISTS )?(\w+)/i);
                    const indexName = indexMatch ? indexMatch[1] : 'unknown';

                    // 테이블 이름 추출
                    const tableMatch = statement.match(/ON (\w+)/i);
                    const tableName = tableMatch ? tableMatch[1] : 'unknown';

                    process.stdout.write(`  Creating index ${indexName} on ${tableName}...`);

                    await connection.execute(statement);
                    console.log(' ✅');
                    successCount++;
                } catch (error) {
                    if (error.code === 'ER_DUP_KEYNAME') {
                        console.log(' ⏩ (already exists)');
                        skipCount++;
                    } else {
                        console.log(' ❌');
                        console.error(`    Error: ${error.message}`);
                        errorCount++;
                    }
                }
            } else if (statement.toUpperCase().startsWith('ANALYZE TABLE')) {
                try {
                    const tableMatch = statement.match(/ANALYZE TABLE (\w+)/i);
                    const tableName = tableMatch ? tableMatch[1] : 'unknown';

                    process.stdout.write(`  Analyzing table ${tableName}...`);
                    await connection.execute(statement);
                    console.log(' ✅');
                } catch (error) {
                    console.log(' ⚠️');
                    console.error(`    Warning: ${error.message}`);
                }
            }
        }

        // 결과 요약
        console.log('\n' + '='.repeat(60));
        console.log('📊 인덱스 추가 결과:');
        console.log('='.repeat(60));
        console.log(`  ✅ 성공: ${successCount}개`);
        console.log(`  ⏩ 이미 존재: ${skipCount}개`);
        if (errorCount > 0) {
            console.log(`  ❌ 실패: ${errorCount}개`);
        }
        console.log('='.repeat(60));

        // 현재 인덱스 상태 확인
        console.log('\n📋 현재 인덱스 상태:');
        console.log('-'.repeat(60));

        const tables = [
            'students', 'student_events', 'classes', 'enrollments',
            'attendance', 'billings', 'payments', 'teachers'
        ];

        for (const table of tables) {
            try {
                const [indexes] = await connection.execute(`SHOW INDEXES FROM ${table}`);
                const indexNames = [...new Set(indexes.map(idx => idx.Key_name))];
                console.log(`  ${table}: ${indexNames.length}개 인덱스`);
                indexNames.forEach(name => {
                    const isPrimary = name === 'PRIMARY';
                    console.log(`    - ${name}${isPrimary ? ' (PK)' : ''}`);
                });
            } catch (error) {
                console.log(`  ${table}: 테이블 없음`);
            }
        }

        console.log('\n✅ 인덱스 추가 완료!');

    } catch (error) {
        console.error('❌ 인덱스 추가 실패:', error);
        throw error;
    } finally {
        connection.release();
        process.exit();
    }
}

// 스크립트 실행
addPerformanceIndexes();