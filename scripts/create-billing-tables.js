const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function createBillingTables() {
    console.log('청구 및 수납 관리 시스템 테이블 생성 중...');

    try {
        // SQL 파일 읽기
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create-billing-tables.sql');
        let sqlContent = fs.readFileSync(sqlPath, 'utf8');

        // USE 문 제거 (이미 연결된 DB 사용)
        sqlContent = sqlContent.replace(/USE\s+\w+;/gi, '');

        // DELIMITER 처리를 위한 분리
        const blocks = sqlContent.split('DELIMITER');

        // 첫 번째 블록 (테이블 생성)
        const tableStatements = blocks[0].split(';').filter(stmt => stmt.trim());

        console.log(`실행할 SQL 문: ${tableStatements.length}개`);

        // 각 테이블 생성문 실행
        for (let i = 0; i < tableStatements.length; i++) {
            const statement = tableStatements[i].trim();
            if (statement) {
                try {
                    await db.execute(statement);
                    // 테이블 이름 추출 시도
                    const tableMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
                    const viewMatch = statement.match(/CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(\w+)/i);
                    const insertMatch = statement.match(/INSERT\s+INTO\s+(\w+)/i);

                    if (tableMatch) {
                        console.log(`✓ 테이블 생성: ${tableMatch[1]}`);
                    } else if (viewMatch) {
                        console.log(`✓ 뷰 생성: ${viewMatch[1]}`);
                    } else if (insertMatch) {
                        console.log(`✓ 데이터 삽입: ${insertMatch[1]}`);
                    } else {
                        console.log(`✓ SQL 문 실행 완료 (${i + 1}/${tableStatements.length})`);
                    }
                } catch (error) {
                    console.error(`SQL 실행 오류 (문 ${i + 1}):`, error.message);
                    // 계속 진행
                }
            }
        }

        // 트리거 생성 (DELIMITER 사용 부분)
        if (blocks.length > 1) {
            console.log('\n트리거 생성 중...');

            // DELIMITER // 블록 처리
            const triggerBlock = blocks[1].replace(/^\/\//, '').replace(/\/\/$/, '');
            const triggers = triggerBlock.split('//').filter(t => t.trim());

            for (const trigger of triggers) {
                if (trigger.trim() && trigger.includes('CREATE TRIGGER')) {
                    try {
                        await db.execute(trigger.trim());
                        const triggerMatch = trigger.match(/CREATE\s+TRIGGER\s+(\w+)/i);
                        if (triggerMatch) {
                            console.log(`✓ 트리거 생성: ${triggerMatch[1]}`);
                        }
                    } catch (error) {
                        console.error('트리거 생성 오류:', error.message);
                        // 계속 진행
                    }
                }
            }
        }

        console.log('\n✅ 청구 및 수납 관리 시스템 테이블 생성 완료!');

        // 생성된 테이블 확인
        console.log('\n생성된 테이블 확인:');
        const [tables] = await db.execute(`
            SELECT TABLE_NAME
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME LIKE '%billing%'
            OR TABLE_NAME LIKE '%payment%'
            OR TABLE_NAME LIKE '%charge%'
            OR TABLE_NAME LIKE '%refund%'
            OR TABLE_NAME LIKE '%discount%'
            ORDER BY TABLE_NAME
        `);

        tables.forEach(table => {
            console.log(`  - ${table.TABLE_NAME}`);
        });

        console.log('\n총 테이블 수:', tables.length);

    } catch (error) {
        console.error('오류 발생:', error);
    } finally {
        await db.end();
    }
}

// 실행
createBillingTables();