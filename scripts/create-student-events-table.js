const mysql = require('mysql2/promise');
require('dotenv').config();

async function createStudentEventsTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('✅ 데이터베이스 연결 성공');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS student_events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        academy_id INT NOT NULL,
        student_id INT NOT NULL,
        event_type ENUM('join', 'rejoin', 'exit') NOT NULL COMMENT 'join: 신규가입, rejoin: 재원, exit: 퇴원',
        event_date DATE NOT NULL COMMENT '이벤트 발생 날짜',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성 시각',

        INDEX idx_academy_date (academy_id, event_date),
        INDEX idx_academy_type_date (academy_id, event_type, event_date),
        INDEX idx_student (student_id),

        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='학생 이벤트 로그 테이블'
    `;

    await connection.execute(createTableSQL);
    console.log('✅ student_events 테이블 생성 완료');

    // 테이블 구조 확인
    const [columns] = await connection.execute('DESCRIBE student_events');
    console.log('\n📋 테이블 구조:');
    console.table(columns);

    // 인덱스 확인
    const [indexes] = await connection.execute('SHOW INDEX FROM student_events');
    console.log('\n🔍 인덱스 목록:');
    console.table(indexes.map(idx => ({
      인덱스명: idx.Key_name,
      컬럼: idx.Column_name,
      유니크: idx.Non_unique === 0 ? 'YES' : 'NO'
    })));

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('\n✅ 데이터베이스 연결 종료');
  }
}

createStudentEventsTable()
  .then(() => {
    console.log('\n🎉 student_events 테이블 생성 작업 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 작업 실패:', error);
    process.exit(1);
  });
