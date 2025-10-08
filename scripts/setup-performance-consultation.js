/**
 * 성적 관리 및 상담 관리 시스템 데이터베이스 설정 스크립트
 *
 * 사용법:
 * node scripts/setup-performance-consultation.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

async function setupPerformanceConsultation() {
    let connection;

    try {
        console.log('🔄 성적/상담 관리 시스템 데이터베이스 설정을 시작합니다...\n');

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

        // 성적 관리 테이블 생성
        console.log('📊 성적 관리 테이블을 생성합니다...\n');
        const performanceSqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create-performance-tables.sql');
        const performanceSql = await fs.readFile(performanceSqlPath, 'utf8');

        // SQL을 개별 쿼리로 분리
        const performanceQueries = performanceSql
            .split('DELIMITER')
            .map(section => section.trim())
            .filter(section => section.length > 0);

        for (const section of performanceQueries) {
            if (section.startsWith('$$')) {
                // 트리거 생성 쿼리
                const triggerQueries = section
                    .replace(/^\$\$/, '')
                    .replace(/\$\$$/, '')
                    .split('$$')
                    .filter(q => q.trim().length > 0);

                for (const query of triggerQueries) {
                    try {
                        await connection.execute(query);
                        console.log('  ⚡ 트리거 생성 완료');
                    } catch (error) {
                        if (error.code === 'ER_TRG_ALREADY_EXISTS') {
                            console.log('  ⚠️ 트리거가 이미 존재합니다');
                        } else {
                            console.error(`  ❌ 트리거 생성 오류: ${error.message}`);
                        }
                    }
                }
            } else if (section !== ';') {
                // 일반 SQL 쿼리
                const queries = section
                    .split(';')
                    .map(q => q.trim())
                    .filter(q => q.length > 0 && !q.startsWith('--'));

                for (const query of queries) {
                    try {
                        await connection.execute(query);

                        if (query.includes('CREATE TABLE')) {
                            const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
                            if (tableName) {
                                console.log(`  📊 테이블 생성: ${tableName}`);
                            }
                        } else if (query.includes('CREATE OR REPLACE VIEW')) {
                            const viewName = query.match(/CREATE OR REPLACE VIEW (\w+)/)?.[1];
                            if (viewName) {
                                console.log(`  👁️ 뷰 생성: ${viewName}`);
                            }
                        }
                    } catch (error) {
                        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                            console.log(`  ⚠️ 테이블이 이미 존재합니다`);
                        } else {
                            console.error(`  ❌ 오류: ${error.message}`);
                        }
                    }
                }
            }
        }

        console.log('\n✅ 성적 관리 테이블 생성 완료\n');

        // 상담 관리 테이블 생성
        console.log('💬 상담 관리 테이블을 생성합니다...\n');
        const consultationSqlPath = path.join(__dirname, '..', 'database', 'migrations', 'create-consultation-tables.sql');
        const consultationSql = await fs.readFile(consultationSqlPath, 'utf8');

        const consultationQueries = consultationSql
            .split(';')
            .map(q => q.trim())
            .filter(q => q.length > 0 && !q.startsWith('--') && !q.startsWith('/*'));

        for (const query of consultationQueries) {
            try {
                await connection.execute(query);

                if (query.includes('CREATE TABLE')) {
                    const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
                    if (tableName) {
                        console.log(`  💬 테이블 생성: ${tableName}`);
                    }
                } else if (query.includes('CREATE OR REPLACE VIEW')) {
                    const viewName = query.match(/CREATE OR REPLACE VIEW (\w+)/)?.[1];
                    if (viewName) {
                        console.log(`  👁️ 뷰 생성: ${viewName}`);
                    }
                }
            } catch (error) {
                if (error.code === 'ER_TABLE_EXISTS_ERROR') {
                    console.log(`  ⚠️ 테이블이 이미 존재합니다`);
                } else {
                    console.error(`  ❌ 오류: ${error.message}`);
                }
            }
        }

        console.log('\n✅ 상담 관리 테이블 생성 완료\n');

        // 기본 상담 분류 데이터 생성
        console.log('📝 기본 상담 분류를 생성합니다...\n');

        const [academies] = await connection.execute('SELECT id FROM academies LIMIT 1');

        if (academies.length > 0) {
            const academyId = academies[0].id;

            const defaultCategories = [
                { name: '신규 학생 상담', type: '신규', order: 1, color: '#4CAF50' },
                { name: '정기 상담', type: '재원', order: 2, color: '#2196F3' },
                { name: '성적 상담', type: '재원', order: 3, color: '#FF9800' },
                { name: '학습 태도 상담', type: '재원', order: 4, color: '#9C27B0' },
                { name: '진로 상담', type: '재원', order: 5, color: '#00BCD4' },
                { name: '수강 변경 상담', type: '재원', order: 6, color: '#FFEB3B' },
                { name: '퇴원 상담', type: '퇴원', order: 7, color: '#F44336' },
                { name: '학부모 요청 상담', type: '기타', order: 8, color: '#607D8B' }
            ];

            for (const cat of defaultCategories) {
                try {
                    await connection.execute(
                        `INSERT INTO consultation_categories
                         (academy_id, category_name, category_type, display_order, color)
                         VALUES (?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE color = VALUES(color)`,
                        [academyId, cat.name, cat.type, cat.order, cat.color]
                    );
                    console.log(`  ✅ 상담 분류 생성: ${cat.name}`);
                } catch (error) {
                    console.log(`  ⚠️ 상담 분류 생성 스킵: ${cat.name}`);
                }
            }
        } else {
            console.log('  ⚠️ 등록된 학원이 없습니다. 학원 등록 후 상담 분류를 생성해주세요.');
        }

        console.log('\n✨ 성적/상담 관리 시스템 설정이 완료되었습니다!\n');
        console.log('📌 다음 단계:');
        console.log('1. npm start로 서버 재시작');
        console.log('2. /performance/exams 에서 시험 관리');
        console.log('3. /consultation/records 에서 상담 관리');

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

// 스크립트 실행
setupPerformanceConsultation().catch(console.error);