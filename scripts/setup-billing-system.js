/**
 * 수납/청구 시스템 데이터베이스 설정 스크립트
 *
 * 사용법:
 * node scripts/setup-billing-system.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupBillingSystem() {
    let connection;

    try {
        console.log('🔄 수납/청구 시스템 데이터베이스 설정을 시작합니다...\n');

        // 데이터베이스 연결
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            multipleStatements: true
        });

        console.log('✅ 데이터베이스 연결 성공\n');

        // SQL 파일 읽기
        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create-billing-tables.sql');
        const sqlContent = await fs.readFile(sqlPath, 'utf8');

        console.log('📋 SQL 스크립트를 실행합니다...\n');

        // SQL 실행 (세미콜론으로 분리된 각 쿼리 실행)
        const queries = sqlContent
            .split(';')
            .map(query => query.trim())
            .filter(query => query.length > 0 && !query.startsWith('--'));

        let tableCount = 0;
        let triggerCount = 0;
        let viewCount = 0;

        for (const query of queries) {
            if (query.includes('CREATE TABLE')) {
                const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
                if (tableName) {
                    console.log(`  📊 테이블 생성: ${tableName}`);
                    tableCount++;
                }
            } else if (query.includes('CREATE TRIGGER')) {
                const triggerName = query.match(/CREATE TRIGGER (\w+)/)?.[1];
                if (triggerName) {
                    console.log(`  ⚡ 트리거 생성: ${triggerName}`);
                    triggerCount++;
                }
            } else if (query.includes('CREATE VIEW')) {
                const viewName = query.match(/CREATE OR REPLACE VIEW (\w+)/)?.[1];
                if (viewName) {
                    console.log(`  👁️ 뷰 생성: ${viewName}`);
                    viewCount++;
                }
            }

            try {
                await connection.execute(query);
            } catch (error) {
                if (error.code === 'ER_TRG_ALREADY_EXISTS') {
                    console.log(`    ⚠️ 트리거가 이미 존재합니다 (건너뜀)`);
                } else if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`    ⚠️ 테이블이 이미 존재합니다 (건너뜀)`);
                } else {
                    console.error(`    ❌ 오류: ${error.message}`);
                }
            }
        }

        console.log('\n📈 설정 완료 통계:');
        console.log(`  - 테이블: ${tableCount}개`);
        console.log(`  - 트리거: ${triggerCount}개`);
        console.log(`  - 뷰: ${viewCount}개`);

        // 샘플 데이터 생성 옵션
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const answer = await new Promise(resolve => {
            rl.question('\n샘플 데이터를 생성하시겠습니까? (y/N): ', resolve);
        });

        if (answer.toLowerCase() === 'y') {
            await createSampleData(connection);
        }

        rl.close();

        console.log('\n✨ 수납/청구 시스템 설정이 완료되었습니다!');
        console.log('\n다음 단계:');
        console.log('1. .env 파일에 ENCRYPTION_KEY 설정');
        console.log('2. 이메일 SMTP 설정 (선택사항)');
        console.log('3. SMS/카카오 API 설정 (선택사항)');
        console.log('4. npm start로 서버 재시작');

    } catch (error) {
        console.error('❌ 오류 발생:', error.message);
        console.error('\n해결 방법:');
        console.error('1. .env 파일의 데이터베이스 설정 확인');
        console.error('2. MySQL 서버 실행 상태 확인');
        console.error('3. 데이터베이스 사용자 권한 확인');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

async function createSampleData(connection) {
    console.log('\n📝 샘플 데이터를 생성합니다...\n');

    try {
        // 학원이 있는지 확인
        const [academies] = await connection.execute('SELECT id FROM academies LIMIT 1');

        if (academies.length === 0) {
            console.log('  ⚠️ 등록된 학원이 없습니다. 먼저 학원을 등록해주세요.');
            return;
        }

        const academyId = academies[0].id;
        console.log(`  학원 ID ${academyId}에 샘플 데이터를 생성합니다.`);

        // 청구 항목 생성
        const billingItems = [
            { name: '정규 수업료', amount: 300000, description: '월 정규 수업료' },
            { name: '교재비', amount: 20000, description: '교재 및 학습 자료' },
            { name: '특강비', amount: 150000, description: '특별 강좌 수강료' },
            { name: '모의고사비', amount: 30000, description: '월간 모의고사' }
        ];

        for (const item of billingItems) {
            await connection.execute(
                `INSERT INTO billing_items (academy_id, name, default_amount, description, is_active)
                 VALUES (?, ?, ?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE default_amount = VALUES(default_amount)`,
                [academyId, item.name, item.amount, item.description]
            );
        }
        console.log('  ✅ 청구 항목 4개 생성');

        // 할인 정책 생성
        const discountPolicies = [
            {
                name: '형제 할인',
                type: 'sibling',
                value: 10,
                value_type: 'percentage',
                description: '형제 동시 수강시 10% 할인'
            },
            {
                name: '조기 납부 할인',
                type: 'early_payment',
                value: 5000,
                value_type: 'fixed',
                description: '납부 기한 7일 전 납부시 5,000원 할인'
            },
            {
                name: '3개월 선납 할인',
                type: 'prepayment',
                value: 5,
                value_type: 'percentage',
                description: '3개월 이상 선납시 5% 할인'
            }
        ];

        for (const policy of discountPolicies) {
            await connection.execute(
                `INSERT INTO discount_policies (academy_id, name, policy_type, discount_value, value_type, description, is_active)
                 VALUES (?, ?, ?, ?, ?, ?, TRUE)
                 ON DUPLICATE KEY UPDATE discount_value = VALUES(discount_value)`,
                [academyId, policy.name, policy.type, policy.value, policy.value_type, policy.description]
            );
        }
        console.log('  ✅ 할인 정책 3개 생성');

        // 청구서 템플릿 생성
        await connection.execute(
            `INSERT INTO invoice_templates (academy_id, name, template_type, subject, content, is_default)
             VALUES (?, '기본 청구서 템플릿', 'monthly', '{{month}}월 수업료 납부 안내',
             '안녕하세요, {{student_name}} 학생 학부모님.\\n\\n{{month}}월 수업료 청구 안내드립니다.\\n청구 금액: {{amount}}원\\n납부 기한: {{due_date}}\\n\\n감사합니다.', TRUE)
             ON DUPLICATE KEY UPDATE content = VALUES(content)`,
            [academyId]
        );
        console.log('  ✅ 청구서 템플릿 생성');

        console.log('\n✅ 샘플 데이터 생성 완료!');

    } catch (error) {
        console.error('  ❌ 샘플 데이터 생성 중 오류:', error.message);
    }
}

// 스크립트 실행
setupBillingSystem().catch(console.error);