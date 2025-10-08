const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseStructure() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'clabbit'
    });

    console.log('✅ 데이터베이스 연결 성공\n');

    // 1. classes 테이블 존재 여부 확인
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'classes'"
    );

    if (tables.length > 0) {
      console.log('✅ classes 테이블이 존재합니다.\n');

      // classes 테이블 구조 확인
      const [classesColumns] = await connection.query('DESCRIBE classes');
      console.log('📋 classes 테이블 구조:');
      classesColumns.forEach(col => {
        console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `[${col.Key}]` : ''}`);
      });
      console.log('');

      // classes 테이블 데이터 확인
      const [classesCount] = await connection.query('SELECT COUNT(*) as count FROM classes');
      console.log(`📊 classes 테이블 데이터: ${classesCount[0].count}건\n`);
    } else {
      console.log('❌ classes 테이블이 존재하지 않습니다.\n');
    }

    // 2. students 테이블에 class_id 컬럼 확인
    const [studentsColumns] = await connection.query('DESCRIBE students');
    console.log('📋 students 테이블 구조:');
    studentsColumns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : ''} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    console.log('');

    const hasClassId = studentsColumns.some(col => col.Field === 'class_id');
    if (hasClassId) {
      console.log('✅ students 테이블에 class_id 컬럼이 존재합니다.\n');
    } else {
      console.log('❌ students 테이블에 class_id 컬럼이 존재하지 않습니다.\n');
    }

    // 3. 현재 데이터 상태 확인
    const [studentsCount] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`📊 students 테이블 데이터: ${studentsCount[0].count}건\n`);

    // 결론
    console.log('=' .repeat(50));
    console.log('📌 결론:');
    if (tables.length > 0 && hasClassId) {
      console.log('   ✅ 반별 통계 기능 구현 가능 (classes 테이블 및 class_id 존재)');
    } else if (tables.length > 0 && !hasClassId) {
      console.log('   ⚠️  classes 테이블은 있으나 students.class_id가 없음');
      console.log('   → students 테이블에 class_id 추가 필요');
    } else {
      console.log('   ⚠️  classes 테이블이 없음');
      console.log('   → 반별 통계는 "준비 중"으로 표시하거나 생략');
    }
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkDatabaseStructure().catch(console.error);
