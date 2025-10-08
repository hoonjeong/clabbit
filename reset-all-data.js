const mysql = require('mysql2/promise');
require('dotenv').config();

async function resetAllData() {
  let connection;

  try {
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'clabbit'
    });

    console.log('✅ 데이터베이스 연결 성공');

    // 외래키 체크 비활성화
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔓 외래키 체크 비활성화');

    // 모든 테이블 데이터 삭제 (순서 중요)
    console.log('\n🗑️  데이터 삭제 시작...');

    await connection.query('DELETE FROM students');
    console.log('   ✅ students 테이블 데이터 삭제 완료');

    await connection.query('DELETE FROM user_academy_roles');
    console.log('   ✅ user_academy_roles 테이블 데이터 삭제 완료');

    await connection.query('DELETE FROM academies');
    console.log('   ✅ academies 테이블 데이터 삭제 완료');

    await connection.query('DELETE FROM users');
    console.log('   ✅ users 테이블 데이터 삭제 완료');

    // AUTO_INCREMENT 초기화
    console.log('\n🔄 AUTO_INCREMENT 초기화...');

    await connection.query('ALTER TABLE students AUTO_INCREMENT = 1');
    console.log('   ✅ students AUTO_INCREMENT 초기화');

    await connection.query('ALTER TABLE user_academy_roles AUTO_INCREMENT = 1');
    console.log('   ✅ user_academy_roles AUTO_INCREMENT 초기화');

    await connection.query('ALTER TABLE academies AUTO_INCREMENT = 1');
    console.log('   ✅ academies AUTO_INCREMENT 초기화');

    await connection.query('ALTER TABLE users AUTO_INCREMENT = 1');
    console.log('   ✅ users AUTO_INCREMENT 초기화');

    // 외래키 체크 재활성화
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n🔒 외래키 체크 재활성화');

    // 데이터 확인
    console.log('\n📊 데이터 확인:');

    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    console.log(`   users: ${users[0].count}건`);

    const [academies] = await connection.query('SELECT COUNT(*) as count FROM academies');
    console.log(`   academies: ${academies[0].count}건`);

    const [roles] = await connection.query('SELECT COUNT(*) as count FROM user_academy_roles');
    console.log(`   user_academy_roles: ${roles[0].count}건`);

    const [students] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`   students: ${students[0].count}건`);

    console.log('\n✅ 모든 데이터 초기화 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 데이터베이스 연결 종료');
    }
  }
}

// 실행
resetAllData().catch(console.error);
