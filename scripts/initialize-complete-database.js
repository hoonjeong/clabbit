const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

/**
 * 클래빗 학원 관리 시스템
 * 완전한 데이터베이스 초기화 스크립트
 *
 * 실행 방법: node scripts/initialize-complete-database.js
 */

async function initializeDatabase() {
  let connection;

  try {
    console.log('🚀 클래빗 데이터베이스 초기화 시작...\n');

    // 데이터베이스 연결 (데이터베이스 선택 없이)
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      multipleStatements: true
    });

    console.log('✅ MySQL 서버 연결 성공\n');

    // 1. 완전한 스키마 파일 실행
    console.log('📄 완전한 스키마 파일 읽기 중...');
    const schemaPath = path.join(__dirname, '..', 'database', 'complete-schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');

    console.log('⚙️  데이터베이스 및 테이블 생성 중...');
    await connection.query(schema);
    console.log('✅ 완전한 스키마 생성 완료\n');

    // 데이터베이스 선택
    await connection.query('USE clabbit');

    // 2. 테이블 확인
    console.log('📊 생성된 테이블 확인:\n');
    const [tables] = await connection.query('SHOW TABLES');

    console.log(`총 ${tables.length}개의 테이블이 생성되었습니다:\n`);
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${tableName}`);
    });

    // 3. 주요 테이블 구조 확인
    console.log('\n\n📋 주요 테이블 구조 확인:\n');

    const importantTables = [
      'users',
      'academies',
      'user_academy_roles',
      'students',
      'student_events',
      'teachers',
      'classes',
      'enrollments',
      'attendance_records',
      'student_charges',
      'payment_records',
      'exams',
      'student_scores',
      'consultations'
    ];

    for (const tableName of importantTables) {
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
      console.log(`\n🔹 ${tableName} (${columns.length}개 컬럼)`);

      // 주요 컬럼만 표시
      const keyColumns = columns.filter(col =>
        col.Key === 'PRI' ||
        col.Key === 'MUL' ||
        col.Field.includes('_id') ||
        col.Field === 'name' ||
        col.Field === 'status'
      );

      keyColumns.forEach(col => {
        let indicator = '';
        if (col.Key === 'PRI') indicator = '🔑';
        else if (col.Key === 'MUL') indicator = '🔗';
        console.log(`   ${indicator} ${col.Field}: ${col.Type}`);
      });
    }

    // 4. 인덱스 확인
    console.log('\n\n📌 중요 인덱스 확인:\n');

    const indexCheckTables = ['students', 'student_events', 'attendance_records', 'student_charges'];

    for (const tableName of indexCheckTables) {
      const [indexes] = await connection.query(`SHOW INDEX FROM ${tableName}`);
      const uniqueIndexes = [...new Set(indexes.map(idx => idx.Key_name))];
      console.log(`  ${tableName}: ${uniqueIndexes.length}개 인덱스`);
    }

    // 5. Foreign Key 제약조건 확인
    console.log('\n\n🔐 Foreign Key 제약조건 확인:\n');

    const [fkInfo] = await connection.query(`
      SELECT
        TABLE_NAME,
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        REFERENCED_TABLE_SCHEMA = 'clabbit'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, CONSTRAINT_NAME
    `);

    const fkByTable = {};
    fkInfo.forEach(fk => {
      if (!fkByTable[fk.TABLE_NAME]) {
        fkByTable[fk.TABLE_NAME] = 0;
      }
      fkByTable[fk.TABLE_NAME]++;
    });

    Object.entries(fkByTable).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}개 FK 제약조건`);
    });

    // 6. 샘플 데이터 확인
    console.log('\n\n📈 현재 데이터 상태:\n');

    const dataTables = [
      { name: 'users', label: '사용자' },
      { name: 'academies', label: '학원' },
      { name: 'students', label: '학생' },
      { name: 'teachers', label: '강사' },
      { name: 'classes', label: '수업' }
    ];

    for (const { name, label } of dataTables) {
      const [[{ count }]] = await connection.query(`SELECT COUNT(*) as count FROM ${name}`);
      console.log(`  ${label}: ${count}건`);
    }

    // 7. 최종 요약
    console.log('\n\n' + '='.repeat(60));
    console.log('✅ 데이터베이스 초기화 완료!');
    console.log('='.repeat(60));

    console.log('\n📝 다음 단계:\n');
    console.log('  1. 서버 시작: npm start');
    console.log('  2. 브라우저에서 접속: http://localhost:3000');
    console.log('  3. 회원가입 후 학원 등록');
    console.log('  4. 학원 선택 후 시스템 사용 시작\n');

    console.log('💡 참고사항:\n');
    console.log('  - 모든 테이블은 academy_id를 통한 멀티테넌시 지원');
    console.log('  - Foreign Key 제약조건으로 데이터 무결성 보장');
    console.log('  - 최적화된 인덱스로 빠른 조회 성능 제공');
    console.log('  - bcrypt 암호화된 비밀번호 저장\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 데이터베이스 초기화 오류:', error.message);
    console.error('\n상세 오류:', error);

    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n💡 해결 방법:');
      console.error('  1. .env 파일의 DB_USER, DB_PASSWORD 확인');
      console.error('  2. MySQL 사용자 권한 확인');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 해결 방법:');
      console.error('  1. MySQL 서버가 실행 중인지 확인');
      console.error('  2. DB_HOST, DB_PORT 설정 확인');
    }

    if (connection) await connection.end();
    process.exit(1);
  }
}

// 스크립트 실행
initializeDatabase();
