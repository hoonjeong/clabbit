require('dotenv').config();
const mysql = require('mysql2/promise');

async function createClassesTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('📚 수업(classes) 테이블 생성 시작...\n');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS classes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        academy_id INT NOT NULL COMMENT '학원 ID',
        class_name VARCHAR(100) NOT NULL COMMENT '수업 이름',
        tuition INT NOT NULL DEFAULT 0 COMMENT '수강료',
        schedule VARCHAR(200) COMMENT '수업 시간 (요일 + 시간)',
        teacher_id INT COMMENT '담당강사 ID',
        teacher_name VARCHAR(50) COMMENT '담당강사 이름',
        grade VARCHAR(20) COMMENT '학년 (초등/중등/고등 등)',
        capacity INT COMMENT '정원',
        current_students INT DEFAULT 0 COMMENT '현재 학생 수',
        description TEXT COMMENT '수업 설명',
        start_date DATE NOT NULL COMMENT '시작일',
        end_date DATE COMMENT '종료일',
        status ENUM('active', 'completed') DEFAULT 'active' COMMENT '상태 (진행중/종강)',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

        INDEX idx_academy_id (academy_id),
        INDEX idx_status (status),
        INDEX idx_teacher_id (teacher_id),
        INDEX idx_grade (grade),
        INDEX idx_start_date (start_date),

        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 정보'
    `;

    await connection.execute(createTableSQL);
    console.log('✅ classes 테이블 생성 완료');

    // 테이블 구조 확인
    const [columns] = await connection.execute('DESCRIBE classes');
    console.log('\n📋 테이블 구조:');
    console.table(columns);

    // 테이블 개수 확인
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM classes');
    console.log(`\n📊 현재 수업 개수: ${countResult[0].count}개\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createClassesTable()
  .then(() => {
    console.log('✅ 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 작업 실패:', error);
    process.exit(1);
  });
