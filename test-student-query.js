const mysql = require('mysql2/promise');
require('dotenv').config();

async function testStudentQuery() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'clabbit'
    });

    console.log('✅ 데이터베이스 연결 성공\n');

    // 학원 ID 1로 active 학생 조회 (API가 하는 것과 동일한 쿼리)
    const academyId = 1;
    const query = 'SELECT * FROM students WHERE academy_id = ? AND status = ? ORDER BY enrollment_date DESC';

    console.log('실행 쿼리:', query);
    console.log('파라미터:', [academyId, 'active'], '\n');

    const [rows] = await connection.execute(query, [academyId, 'active']);

    console.log(`📊 조회 결과: ${rows.length}건\n`);

    if (rows.length > 0) {
      console.log('학생 목록:');
      rows.forEach((student, index) => {
        console.log(`${index + 1}. ID: ${student.id}, 이름: ${student.name}, 상태: ${student.status}, 입학일: ${student.enrollment_date}`);
      });
    } else {
      console.log('⚠️ 조회된 데이터가 없습니다!');

      // 모든 학생 데이터 확인
      const [allStudents] = await connection.execute('SELECT * FROM students');
      console.log(`\n전체 학생 수: ${allStudents.length}`);
      if (allStudents.length > 0) {
        console.log('전체 학생 정보:');
        allStudents.forEach(s => {
          console.log(`- ID: ${s.id}, 이름: ${s.name}, academy_id: ${s.academy_id}, status: ${s.status}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testStudentQuery().catch(console.error);
