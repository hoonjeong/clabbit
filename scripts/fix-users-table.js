const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixUsersTable() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔄 users 테이블 마이그레이션 시작...\n');

    // 1. owner_name을 name으로 변경
    console.log('1️⃣ owner_name → name 변경 중...');
    await connection.query(`
      ALTER TABLE users
      CHANGE COLUMN owner_name name VARCHAR(100) NOT NULL COMMENT '이름'
    `);
    console.log('✅ owner_name → name 변경 완료\n');

    // 2. academy_name 컬럼 제거
    console.log('2️⃣ academy_name 컬럼 제거 중...');
    await connection.query('ALTER TABLE users DROP COLUMN academy_name');
    console.log('✅ academy_name 컬럼 제거 완료\n');

    // 3. agree_terms 컬럼 제거
    console.log('3️⃣ agree_terms 컬럼 제거 중...');
    await connection.query('ALTER TABLE users DROP COLUMN agree_terms');
    console.log('✅ agree_terms 컬럼 제거 완료\n');

    // 4. agree_marketing 컬럼 제거
    console.log('4️⃣ agree_marketing 컬럼 제거 중...');
    await connection.query('ALTER TABLE users DROP COLUMN agree_marketing');
    console.log('✅ agree_marketing 컬럼 제거 완료\n');

    // 5. password 컬럼 타입 변경
    console.log('5️⃣ password 타입 변경 중 (varchar(40) → varchar(255))...');
    await connection.query(`
      ALTER TABLE users
      MODIFY COLUMN password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt)'
    `);
    console.log('✅ password 타입 변경 완료\n');

    // 6. phone 컬럼 NULL 허용
    console.log('6️⃣ phone 컬럼 NULL 허용으로 변경 중...');
    await connection.query(`
      ALTER TABLE users
      MODIFY COLUMN phone VARCHAR(20) COMMENT '연락처'
    `);
    console.log('✅ phone 컬럼 변경 완료\n');

    // 7. 최종 구조 확인
    console.log('7️⃣ 최종 테이블 구조:');
    const [columns] = await connection.query('SHOW COLUMNS FROM users');
    console.table(columns.map(col => ({
      컬럼명: col.Field,
      타입: col.Type,
      NULL허용: col.Null,
      기본값: col.Default,
      설명: col.Comment
    })));

    console.log('\n✅ users 테이블 마이그레이션 완료!');
    console.log('\n📝 변경 사항:');
    console.log('   - academy_name 컬럼 제거 ✓');
    console.log('   - owner_name → name 으로 변경 ✓');
    console.log('   - agree_terms, agree_marketing 컬럼 제거 ✓');
    console.log('   - password 타입: VARCHAR(40) → VARCHAR(255) ✓');
    console.log('   - phone NULL 허용 ✓');

    console.log('\n⚠️ 주의: 기존 비밀번호는 SHA1 해시입니다.');
    console.log('   기존 사용자는 비밀번호를 재설정해야 합니다.\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 마이그레이션 오류:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

fixUsersTable();
