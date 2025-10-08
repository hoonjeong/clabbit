require('dotenv').config();
const db = require('./src/config/database');

async function testClassesAPI() {
  try {
    console.log('🔍 classes 테이블 확인...\n');

    // 테이블 존재 확인
    const [tables] = await db.execute("SHOW TABLES LIKE 'classes'");
    console.log('테이블 존재:', tables.length > 0);

    if (tables.length === 0) {
      console.log('❌ classes 테이블이 없습니다!');
      process.exit(1);
    }

    // 테이블 구조 확인
    const [columns] = await db.execute('DESCRIBE classes');
    console.log('\n📋 테이블 컬럼:');
    columns.forEach(col => console.log(`  - ${col.Field} (${col.Type})`));

    // 간단한 SELECT 테스트
    console.log('\n🔍 SELECT 테스트...');
    const [rows] = await db.execute('SELECT * FROM classes WHERE academy_id = ?', [1]);
    console.log(`결과: ${rows.length}개 행`);

    // COUNT 테스트
    console.log('\n🔍 COUNT 테스트...');
    const [countResult] = await db.execute('SELECT COUNT(*) as count FROM classes WHERE academy_id = ?', [1]);
    console.log(`카운트 결과: ${countResult[0].count}개`);

    console.log('\n✅ 모든 테스트 통과!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error('상세:', error);
  } finally {
    process.exit(0);
  }
}

testClassesAPI();
