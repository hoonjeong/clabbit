const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runMigration() {
  console.log('🔄 enrollments 테이블에 fee_adjustment_reason 컬럼 추가 중...\n');

  try {
    const sqlPath = path.join(__dirname, '../database/migrations/add-fee-adjustment-reason.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await db.execute(sql);

    console.log('✅ fee_adjustment_reason 컬럼이 성공적으로 추가되었습니다!\n');

    // 테이블 구조 확인
    const [columns] = await db.execute('DESCRIBE enrollments');
    console.log('📋 enrollments 테이블 구조:');
    console.table(columns);

    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실행 중 오류 발생:', error.message);
    process.exit(1);
  }
}

runMigration();
