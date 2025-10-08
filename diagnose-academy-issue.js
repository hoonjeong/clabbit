const mysql = require('mysql2/promise');
require('dotenv').config();

async function diagnose() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'clabbit'
    });

    console.log('✅ 데이터베이스 연결 성공\n');
    console.log('='.repeat(60));
    console.log('1. students 테이블 구조 확인');
    console.log('='.repeat(60));

    const [columns] = await connection.query('DESCRIBE students');
    console.table(columns);

    console.log('\n' + '='.repeat(60));
    console.log('2. 최근 등록된 학생 데이터 확인');
    console.log('='.repeat(60));

    const [recentStudents] = await connection.query(`
      SELECT id, name, academy_id, enrollment_date, created_at, status
      FROM students
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.table(recentStudents);

    console.log('\n' + '='.repeat(60));
    console.log('3. academy_id NULL 확인');
    console.log('='.repeat(60));

    const [[nullCount]] = await connection.query(`
      SELECT COUNT(*) as null_count
      FROM students
      WHERE academy_id IS NULL
    `);
    console.log(`academy_id가 NULL인 학생: ${nullCount.null_count}명`);

    console.log('\n' + '='.repeat(60));
    console.log('4. academy_id별 학생 수');
    console.log('='.repeat(60));

    const [groupByAcademy] = await connection.query(`
      SELECT
        COALESCE(academy_id, 'NULL') as academy_id,
        COUNT(*) as student_count
      FROM students
      GROUP BY academy_id
    `);
    console.table(groupByAcademy);

    console.log('\n' + '='.repeat(60));
    console.log('5. academy_id = 1로 조회');
    console.log('='.repeat(60));

    const [academy1Students] = await connection.query(`
      SELECT id, name, academy_id, status, enrollment_date
      FROM students
      WHERE academy_id = 1
    `);
    console.log(`academy_id = 1인 학생: ${academy1Students.length}명`);
    console.table(academy1Students);

    console.log('\n' + '='.repeat(60));
    console.log('6. 학원 정보 확인');
    console.log('='.repeat(60));

    const [academies] = await connection.query('SELECT * FROM academies');
    console.table(academies);

    console.log('\n' + '='.repeat(60));
    console.log('진단 완료');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

diagnose().catch(console.error);
