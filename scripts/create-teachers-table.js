require('dotenv').config();
const mysql = require('mysql2/promise');

async function createTeachersTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('👨‍🏫 강사(teachers) 테이블 생성 시작...\n');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS teachers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        academy_id INT NOT NULL COMMENT '학원 ID',
        name VARCHAR(50) NOT NULL COMMENT '강사 이름',
        phone VARCHAR(20) NOT NULL COMMENT '핸드폰 번호',
        email VARCHAR(100) NOT NULL COMMENT '이메일 주소',
        address VARCHAR(200) COMMENT '주소',
        notes TEXT COMMENT '메모',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

        INDEX idx_academy_id (academy_id),
        INDEX idx_name (name),
        INDEX idx_email (email),

        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='강사 정보'
    `;

    await connection.execute(createTableSQL);
    console.log('✅ teachers 테이블 생성 완료');

    // 테이블 구조 확인
    const [columns] = await connection.execute('DESCRIBE teachers');
    console.log('\n📋 테이블 구조:');
    console.table(columns);

    // 테이블 개수 확인
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM teachers');
    console.log(`\n📊 현재 강사 개수: ${countResult[0].count}개\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

createTeachersTable()
  .then(() => {
    console.log('✅ 작업 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 작업 실패:', error);
    process.exit(1);
  });
