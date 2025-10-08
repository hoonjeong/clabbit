const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAttendanceTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clabbit'
  });

  try {
    console.log('📊 출석 테이블 생성 시작...');

    // attendance 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        class_id INT,
        attendance_date DATE NOT NULL,
        status ENUM('출석', '결석', '지각', '조퇴', '병결', '공결') NOT NULL DEFAULT '출석',
        check_in_time TIME,
        check_out_time TIME,
        note TEXT,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_attendance_student (student_id),
        INDEX idx_attendance_date (attendance_date),
        INDEX idx_attendance_class (class_id),
        INDEX idx_attendance_student_date (student_id, attendance_date),
        UNIQUE KEY unique_student_class_date (student_id, class_id, attendance_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='출석 기록'
    `);
    console.log('✅ attendance 테이블 생성 완료');

    // attendance_history 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        attendance_id INT NOT NULL,
        old_status VARCHAR(10),
        new_status VARCHAR(10),
        old_check_in_time TIME,
        new_check_in_time TIME,
        old_check_out_time TIME,
        new_check_out_time TIME,
        reason TEXT NOT NULL COMMENT '정정 사유',
        modified_by INT,
        modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (attendance_id) REFERENCES attendance(id) ON DELETE CASCADE,
        FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_history_attendance (attendance_id),
        INDEX idx_history_date (modified_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='출석 수정 이력'
    `);
    console.log('✅ attendance_history 테이블 생성 완료');

    console.log('🎉 모든 테이블 생성이 완료되었습니다!');

  } catch (error) {
    console.error('❌ 테이블 생성 중 오류 발생:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  createAttendanceTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = createAttendanceTable;
