const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkStudentsData() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'clabbit'
    });

    console.log('✅ 데이터베이스 연결 성공\n');

    // students 테이블 전체 데이터 확인
    const [students] = await connection.query('SELECT * FROM students');
    console.log(`📊 students 테이블 전체 데이터: ${students.length}건\n`);

    if (students.length > 0) {
      console.log('학생 목록:');
      students.forEach((student, index) => {
        console.log(`${index + 1}. ID: ${student.id}, 이름: ${student.name}, academy_id: ${student.academy_id}, status: ${student.status}`);
      });
    }

    // academies 테이블 확인
    console.log('\n' + '='.repeat(50));
    const [academies] = await connection.query('SELECT * FROM academies');
    console.log(`\n📊 academies 테이블 데이터: ${academies.length}건\n`);

    if (academies.length > 0) {
      console.log('학원 목록:');
      academies.forEach((academy, index) => {
        console.log(`${index + 1}. ID: ${academy.id}, 이름: ${academy.name}`);
      });
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

checkStudentsData().catch(console.error);
