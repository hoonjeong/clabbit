const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanupAndEnforce() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔄 데이터 정리 및 academy_id 강제 적용 시작...\n');

    // 1. 기존 데이터 삭제
    console.log('1️⃣ 기존 데이터 삭제 중...');

    // Foreign Key 제약 때문에 순서대로 삭제
    await connection.query('DELETE FROM students');
    console.log('   ✅ students 테이블 데이터 삭제 완료');

    await connection.query('DELETE FROM user_academy_roles');
    console.log('   ✅ user_academy_roles 테이블 데이터 삭제 완료');

    await connection.query('DELETE FROM academies');
    console.log('   ✅ academies 테이블 데이터 삭제 완료\n');

    // 2. students 테이블의 academy_id를 NOT NULL로 변경
    console.log('2️⃣ students.academy_id NOT NULL 제약 추가 중...');

    // 기존 Foreign Key 제약조건 확인 및 제거
    const [constraints] = await connection.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'academy_id'
        AND CONSTRAINT_NAME != 'PRIMARY'
    `, [process.env.DB_NAME]);

    for (const constraint of constraints) {
      if (constraint.CONSTRAINT_NAME !== 'PRIMARY') {
        try {
          await connection.query(`ALTER TABLE students DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}`);
          console.log(`   ✅ 기존 Foreign Key ${constraint.CONSTRAINT_NAME} 제거 완료`);
        } catch (error) {
          console.log(`   ⚠️ Foreign Key 제거 실패: ${error.message}`);
        }
      }
    }

    // 기존 인덱스 확인 및 제거
    const [indexes] = await connection.query(`
      SHOW INDEX FROM students WHERE Column_name = 'academy_id' AND Key_name != 'PRIMARY'
    `);

    for (const index of indexes) {
      try {
        await connection.query(`ALTER TABLE students DROP INDEX ${index.Key_name}`);
        console.log(`   ✅ 기존 인덱스 ${index.Key_name} 제거 완료`);
      } catch (error) {
        console.log(`   ⚠️ 인덱스 제거 실패: ${error.message}`);
      }
    }

    // academy_id NOT NULL로 변경
    await connection.query(`
      ALTER TABLE students
      MODIFY COLUMN academy_id INT NOT NULL COMMENT '학원 ID'
    `);
    console.log('   ✅ academy_id NOT NULL 제약 추가 완료');

    // Foreign Key 재추가
    await connection.query(`
      ALTER TABLE students
      ADD CONSTRAINT fk_students_academy
      FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
    `);
    console.log('   ✅ Foreign Key 제약조건 재추가 완료');

    // 인덱스 재추가
    await connection.query('ALTER TABLE students ADD INDEX idx_academy (academy_id)');
    console.log('   ✅ 인덱스 재추가 완료\n');

    // 3. 최종 테이블 구조 확인
    console.log('3️⃣ 최종 students 테이블 구조:');
    const [columns] = await connection.query('SHOW COLUMNS FROM students');
    console.table(columns.map(col => ({
      컬럼명: col.Field,
      타입: col.Type,
      NULL: col.Null,
      키: col.Key,
      기본값: col.Default
    })));

    // 4. 데이터 확인
    console.log('\n4️⃣ 현재 데이터 상태:');
    const [[academyCount]] = await connection.query('SELECT COUNT(*) as count FROM academies');
    const [[studentCount]] = await connection.query('SELECT COUNT(*) as count FROM students');
    const [[roleCount]] = await connection.query('SELECT COUNT(*) as count FROM user_academy_roles');
    const [[userCount]] = await connection.query('SELECT COUNT(*) as count FROM users');

    console.log(`   📊 academies: ${academyCount.count}개`);
    console.log(`   📊 students: ${studentCount.count}개`);
    console.log(`   📊 user_academy_roles: ${roleCount.count}개`);
    console.log(`   📊 users: ${userCount.count}개`);

    console.log('\n✅ 데이터 정리 및 제약조건 적용 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. Student Model에 academyId 필터링 적용');
    console.log('   2. Students Controller에 req.academyId 전달');
    console.log('   3. Dashboard Controller에 academy_id 적용');
    console.log('   4. Statistics Service에 academyId 파라미터 추가');
    console.log('   5. Excel Service에 academyId 필터링 적용\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

cleanupAndEnforce();
