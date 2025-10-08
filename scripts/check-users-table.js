const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsersTable() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ 데이터베이스 연결 성공\n');

    // 현재 테이블 구조 확인
    const [columns] = await connection.query('SHOW COLUMNS FROM users');

    console.log('📊 현재 users 테이블 구조:');
    console.table(columns.map(col => ({
      컬럼명: col.Field,
      타입: col.Type,
      NULL허용: col.Null,
      키: col.Key,
      기본값: col.Default
    })));

    // 필요한 변경사항 확인
    const columnNames = columns.map(col => col.Field);

    console.log('\n📝 필요한 변경사항:');

    if (!columnNames.includes('name')) {
      console.log('  ❌ name 컬럼이 없습니다. 추가 필요');
      if (columnNames.includes('owner_name')) {
        console.log('     → owner_name을 name으로 변경');
      } else {
        console.log('     → name 컬럼 새로 추가');
      }
    } else {
      console.log('  ✅ name 컬럼 존재');
    }

    if (columnNames.includes('academy_name')) {
      console.log('  ❌ academy_name 컬럼 제거 필요');
    } else {
      console.log('  ✅ academy_name 컬럼 없음');
    }

    if (columnNames.includes('owner_name')) {
      console.log('  ❌ owner_name 컬럼 제거 필요');
    } else {
      console.log('  ✅ owner_name 컬럼 없음');
    }

    const passwordCol = columns.find(col => col.Field === 'password');
    if (passwordCol && passwordCol.Type === 'varchar(40)') {
      console.log('  ❌ password 타입 변경 필요: varchar(40) → varchar(255)');
    } else {
      console.log('  ✅ password 타입 적절');
    }

    const phoneCol = columns.find(col => col.Field === 'phone');
    if (phoneCol && phoneCol.Null === 'NO') {
      console.log('  ❌ phone 컬럼 NULL 허용으로 변경 필요');
    } else {
      console.log('  ✅ phone 컬럼 NULL 허용');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ 오류:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkUsersTable();
