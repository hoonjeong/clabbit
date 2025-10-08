const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAllTables() {
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

    // 모든 테이블 목록 조회
    const [tables] = await connection.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);

    console.log('📊 현재 데이터베이스의 모든 테이블:');
    console.log(tableNames.join(', '));
    console.log(`\n총 ${tableNames.length}개 테이블\n`);

    // 각 테이블의 구조 확인
    for (const tableName of tableNames) {
      console.log(`\n📋 ${tableName} 테이블 구조:`);
      const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);

      console.table(columns.map(col => ({
        컬럼명: col.Field,
        타입: col.Type,
        NULL: col.Null,
        키: col.Key,
        기본값: col.Default
      })));

      // 데이터 개수 확인
      const [[{ count }]] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`📈 현재 데이터 개수: ${count}개`);

      // academy_id 컬럼 존재 여부
      const hasAcademyId = columns.some(col => col.Field === 'academy_id');
      if (hasAcademyId) {
        console.log('✅ academy_id 컬럼 존재');
      } else if (tableName !== 'users' && tableName !== 'academies' && tableName !== 'user_academy_roles') {
        console.log('❌ academy_id 컬럼 없음 - 추가 필요');
      }
    }

    console.log('\n\n📝 academy_id 추가가 필요한 테이블:');
    const needsAcademyId = [];

    for (const tableName of tableNames) {
      if (tableName === 'users' || tableName === 'academies' || tableName === 'user_academy_roles') {
        continue; // 이 테이블들은 academy_id가 불필요
      }

      const [columns] = await connection.query(`SHOW COLUMNS FROM ${tableName}`);
      const hasAcademyId = columns.some(col => col.Field === 'academy_id');

      if (!hasAcademyId) {
        needsAcademyId.push(tableName);
      }
    }

    if (needsAcademyId.length > 0) {
      console.log(needsAcademyId.map(t => `  - ${t}`).join('\n'));
    } else {
      console.log('  없음 - 모든 테이블에 academy_id가 있습니다.');
    }

    await connection.end();

  } catch (error) {
    console.error('❌ 오류:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

checkAllTables();
