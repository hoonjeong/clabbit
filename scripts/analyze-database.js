/**
 * 데이터베이스 구조 분석 스크립트
 * 테이블 구조, 인덱스, 쿼리 패턴을 분석합니다.
 */

require('dotenv').config();
const db = require('../src/config/database');

async function analyzeDatabaseStructure() {
    const connection = await db.getConnection();

    try {
        console.log('=' . repeat(80));
        console.log('📊 데이터베이스 구조 분석 시작');
        console.log('=' . repeat(80));

        // 1. 모든 테이블 목록 조회
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME, TABLE_ROWS, AUTO_INCREMENT, CREATE_TIME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME
        `, [process.env.DB_NAME || 'clabbit']);

        console.log('\n📋 테이블 목록:');
        console.log('-'.repeat(80));
        tables.forEach(table => {
            console.log(`  - ${table.TABLE_NAME} (Rows: ${table.TABLE_ROWS || 0})`);
        });

        // 2. 각 테이블의 구조 분석
        console.log('\n📝 테이블 구조 상세:');
        console.log('-'.repeat(80));

        for (const table of tables) {
            console.log(`\n[${table.TABLE_NAME}]`);

            // 컬럼 정보
            const [columns] = await connection.execute(`
                SELECT
                    COLUMN_NAME,
                    COLUMN_TYPE,
                    IS_NULLABLE,
                    COLUMN_KEY,
                    COLUMN_DEFAULT,
                    EXTRA,
                    COLUMN_COMMENT
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION
            `, [process.env.DB_NAME || 'clabbit', table.TABLE_NAME]);

            console.log('  Columns:');
            columns.forEach(col => {
                const key = col.COLUMN_KEY ? `[${col.COLUMN_KEY}]` : '';
                const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
                const extra = col.EXTRA || '';
                console.log(`    - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} ${nullable} ${key} ${extra}`);
                if (col.COLUMN_COMMENT) {
                    console.log(`      Comment: ${col.COLUMN_COMMENT}`);
                }
            });

            // 인덱스 정보
            const [indexes] = await connection.execute(`
                SHOW INDEXES FROM ${table.TABLE_NAME}
            `);

            const indexMap = {};
            indexes.forEach(idx => {
                if (!indexMap[idx.Key_name]) {
                    indexMap[idx.Key_name] = {
                        unique: !idx.Non_unique,
                        columns: []
                    };
                }
                indexMap[idx.Key_name].columns.push(idx.Column_name);
            });

            console.log('  Indexes:');
            Object.entries(indexMap).forEach(([name, info]) => {
                const uniqueStr = info.unique ? 'UNIQUE' : '';
                console.log(`    - ${name} ${uniqueStr}: (${info.columns.join(', ')})`);
            });

            // 외래 키 정보
            const [foreignKeys] = await connection.execute(`
                SELECT
                    CONSTRAINT_NAME,
                    COLUMN_NAME,
                    REFERENCED_TABLE_NAME,
                    REFERENCED_COLUMN_NAME
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = ?
                    AND TABLE_NAME = ?
                    AND REFERENCED_TABLE_NAME IS NOT NULL
            `, [process.env.DB_NAME || 'clabbit', table.TABLE_NAME]);

            if (foreignKeys.length > 0) {
                console.log('  Foreign Keys:');
                foreignKeys.forEach(fk => {
                    console.log(`    - ${fk.CONSTRAINT_NAME}: ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}(${fk.REFERENCED_COLUMN_NAME})`);
                });
            }
        }

        // 3. 잠재적 인덱스 추천
        console.log('\n🔍 권장 인덱스 추가:');
        console.log('-'.repeat(80));

        const recommendations = [
            {
                table: 'students',
                reason: '검색 성능 향상',
                indexes: [
                    'CREATE INDEX idx_students_name ON students(name)',
                    'CREATE INDEX idx_students_phone ON students(student_phone, parent_phone)',
                    'CREATE INDEX idx_students_status_date ON students(status, enrollment_date)',
                    'CREATE INDEX idx_students_academy_status ON students(academy_id, status)'
                ]
            },
            {
                table: 'student_events',
                reason: '통계 쿼리 성능 향상',
                indexes: [
                    'CREATE INDEX idx_student_events_academy_type_date ON student_events(academy_id, event_type, event_date)',
                    'CREATE INDEX idx_student_events_student_type ON student_events(student_id, event_type)'
                ]
            },
            {
                table: 'enrollments',
                reason: '수강 내역 조회 성능 향상',
                indexes: [
                    'CREATE INDEX idx_enrollments_academy_student ON enrollments(academy_id, student_id)',
                    'CREATE INDEX idx_enrollments_class ON enrollments(class_id)',
                    'CREATE INDEX idx_enrollments_status ON enrollments(status)'
                ]
            },
            {
                table: 'classes',
                reason: '수업 검색 성능 향상',
                indexes: [
                    'CREATE INDEX idx_classes_academy_teacher ON classes(academy_id, teacher_id)',
                    'CREATE INDEX idx_classes_day_time ON classes(day_of_week, class_time)'
                ]
            },
            {
                table: 'attendance',
                reason: '출석 조회 성능 향상',
                indexes: [
                    'CREATE INDEX idx_attendance_date ON attendance(attendance_date)',
                    'CREATE INDEX idx_attendance_student_date ON attendance(student_id, attendance_date)',
                    'CREATE INDEX idx_attendance_class_date ON attendance(class_id, attendance_date)'
                ]
            },
            {
                table: 'billings',
                reason: '청구서 조회 성능 향상',
                indexes: [
                    'CREATE INDEX idx_billings_student ON billings(student_id)',
                    'CREATE INDEX idx_billings_status_date ON billings(status, billing_date)',
                    'CREATE INDEX idx_billings_academy_month ON billings(academy_id, billing_month)'
                ]
            },
            {
                table: 'payments',
                reason: '결제 내역 조회 성능 향상',
                indexes: [
                    'CREATE INDEX idx_payments_billing ON payments(billing_id)',
                    'CREATE INDEX idx_payments_date ON payments(payment_date)',
                    'CREATE INDEX idx_payments_method ON payments(payment_method)'
                ]
            }
        ];

        for (const rec of recommendations) {
            console.log(`\n  [${rec.table}] - ${rec.reason}`);
            rec.indexes.forEach(idx => {
                console.log(`    ${idx};`);
            });
        }

        // 4. 쿼리 최적화 제안
        console.log('\n⚡ 쿼리 최적화 제안:');
        console.log('-'.repeat(80));
        console.log(`
  1. SELECT * 대신 필요한 컬럼만 명시적으로 선택
  2. JOIN 시 인덱스가 있는 컬럼으로 연결
  3. WHERE 절에 자주 사용되는 컬럼에 인덱스 추가
  4. 대량 데이터 조회 시 페이징 사용 (LIMIT/OFFSET)
  5. COUNT(*) 대신 COUNT(indexed_column) 사용
  6. 복합 인덱스는 선택도가 높은 컬럼을 앞에 배치
  7. LIKE '%keyword' 대신 FULLTEXT 인덱스 고려
        `);

        console.log('\n✅ 분석 완료!');
        console.log('=' . repeat(80));

    } catch (error) {
        console.error('❌ 분석 실패:', error);
        throw error;
    } finally {
        connection.release();
        process.exit();
    }
}

// 스크립트 실행
analyzeDatabaseStructure();