/**
 * 수강 등록 테이블 생성 스크립트
 * enrollments 테이블을 생성하여 학생과 수업을 연결합니다.
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function createEnrollmentsTable() {
  let connection;

  try {
    // 데이터베이스 연결
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ 데이터베이스 연결 성공');

    // enrollments 테이블 생성
    console.log('\nenrollments 테이블 생성 중...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        student_id INT NOT NULL COMMENT '학생 ID',
        class_id INT NOT NULL COMMENT '수업 ID',
        start_date DATE NOT NULL COMMENT '수강 시작일',
        first_month_fee DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '첫 달 원비',
        status ENUM('active', 'completed', 'withdrawn') DEFAULT 'active' COMMENT '수강 상태',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

        INDEX idx_student_id (student_id),
        INDEX idx_class_id (class_id),
        INDEX idx_status (status),
        INDEX idx_student_class (student_id, class_id),

        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,

        UNIQUE KEY unique_active_enrollment (student_id, class_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수강 등록 정보'
    `);

    console.log('✅ enrollments 테이블 생성 완료');

    // 테이블 구조 확인
    console.log('\n테이블 구조 확인:');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'enrollments'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    console.table(columns);

    // 인덱스 확인
    console.log('\n인덱스 확인:');
    const [indexes] = await connection.query(`
      SHOW INDEX FROM enrollments
    `);

    const indexInfo = indexes.map(idx => ({
      Key_name: idx.Key_name,
      Column_name: idx.Column_name,
      Non_unique: idx.Non_unique
    }));
    console.table(indexInfo);

    console.log('\n✅ 모든 작업 완료!');
    console.log('\n다음 단계:');
    console.log('1. Enrollment Model 생성');
    console.log('2. API 엔드포인트 구현');
    console.log('3. 프론트엔드 UI 개발');

  } catch (error) {
    console.error('\n❌ 테이블 생성 실패:', error.message);

    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠ enrollments 테이블이 이미 존재합니다.');
    } else {
      console.error('상세 오류:', error);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
createEnrollmentsTable();
