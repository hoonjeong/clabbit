const db = require('../src/config/database');

async function migrateUsersTable() {
  try {
    console.log('🔄 users 테이블 마이그레이션 시작...\n');

    // 1. 기존 users 테이블 구조 확인
    console.log('1️⃣ 기존 테이블 구조 확인 중...');
    const [columns] = await db.query("SHOW COLUMNS FROM users");
    const columnNames = columns.map(col => col.Field);

    console.log('현재 컬럼:', columnNames.join(', '));

    // 2. 불필요한 컬럼 제거
    const columnsToRemove = ['academy_name', 'owner_name', 'agree_terms', 'agree_marketing'];

    for (const column of columnsToRemove) {
      if (columnNames.includes(column)) {
        console.log(`\n2️⃣ "${column}" 컬럼 제거 중...`);
        await db.query(`ALTER TABLE users DROP COLUMN ${column}`);
        console.log(`✅ "${column}" 컬럼 제거 완료`);
      }
    }

    // 3. owner_name을 name으로 변경 (이미 owner_name이 있고 name이 없는 경우)
    if (columnNames.includes('owner_name') && !columnNames.includes('name')) {
      console.log('\n3️⃣ "owner_name" 컬럼을 "name"으로 변경 중...');
      await db.query(`ALTER TABLE users CHANGE COLUMN owner_name name VARCHAR(100) NOT NULL COMMENT '이름'`);
      console.log('✅ 컬럼명 변경 완료');
    }

    // 4. name 컬럼이 없으면 추가
    const [updatedColumns] = await db.query("SHOW COLUMNS FROM users");
    const updatedColumnNames = updatedColumns.map(col => col.Field);

    if (!updatedColumnNames.includes('name')) {
      console.log('\n4️⃣ "name" 컬럼 추가 중...');
      await db.query(`ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL COMMENT '이름' AFTER password`);
      console.log('✅ "name" 컬럼 추가 완료');
    }

    // 5. password 컬럼 타입 변경 (SHA1 40자 -> bcrypt 255자)
    console.log('\n5️⃣ password 컬럼 타입 변경 중 (bcrypt 지원)...');
    await db.query(`ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt)'`);
    console.log('✅ password 컬럼 타입 변경 완료');

    // 6. phone 컬럼 NULL 허용
    if (updatedColumnNames.includes('phone')) {
      console.log('\n6️⃣ phone 컬럼 NULL 허용으로 변경 중...');
      await db.query(`ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) COMMENT '연락처'`);
      console.log('✅ phone 컬럼 변경 완료');
    }

    // 7. 최종 구조 확인
    console.log('\n7️⃣ 최종 테이블 구조:');
    const [finalColumns] = await db.query("SHOW COLUMNS FROM users");
    console.table(finalColumns.map(col => ({
      컬럼명: col.Field,
      타입: col.Type,
      NULL허용: col.Null,
      기본값: col.Default,
      설명: col.Comment
    })));

    console.log('\n✅ users 테이블 마이그레이션 완료!');
    console.log('\n📝 변경 사항:');
    console.log('   - academy_name 컬럼 제거');
    console.log('   - owner_name → name 으로 변경');
    console.log('   - agree_terms, agree_marketing 컬럼 제거');
    console.log('   - password 타입: VARCHAR(40) → VARCHAR(255)');
    console.log('   - phone NULL 허용');

    console.log('\n⚠️ 주의: 기존 비밀번호는 SHA1 해시입니다.');
    console.log('   기존 사용자는 비밀번호를 재설정해야 합니다.');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 마이그레이션 오류:', error);
    process.exit(1);
  }
}

// 실행
migrateUsersTable();
