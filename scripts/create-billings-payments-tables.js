const mysql = require('mysql2/promise');
require('dotenv').config();

async function createBillingsPaymentsTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'clabbit'
  });

  try {
    console.log('📊 수강료 청구 및 수납 테이블 생성 시작...');

    // billings 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS billings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        student_id INT NOT NULL,
        enrollment_id INT NOT NULL,
        billing_month DATE NOT NULL COMMENT '청구 년월 (YYYY-MM-01 형식)',
        amount DECIMAL(10, 2) NOT NULL COMMENT '청구 금액',
        paid_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '수납된 금액',
        remaining_amount DECIMAL(10, 2) NOT NULL COMMENT '잔액',
        status ENUM('unpaid', 'partial', 'paid') DEFAULT 'unpaid' COMMENT '수납 상태',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
        INDEX idx_billing_month (billing_month),
        INDEX idx_student_status (student_id, status),
        INDEX idx_enrollment (enrollment_id),
        UNIQUE KEY unique_enrollment_month (enrollment_id, billing_month)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수강료 청구 내역'
    `);
    console.log('✅ billings 테이블 생성 완료');

    // payments 테이블 생성
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        billing_id INT NOT NULL,
        student_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL COMMENT '수납 금액',
        payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '수납 일시',
        payment_method VARCHAR(50) COMMENT '수납 방법 (현금, 카드, 계좌이체 등)',
        note TEXT COMMENT '비고',
        created_by INT COMMENT '수납 처리자',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (billing_id) REFERENCES billings(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        INDEX idx_payment_date (payment_date),
        INDEX idx_billing (billing_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수납 내역'
    `);
    console.log('✅ payments 테이블 생성 완료');

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
  createBillingsPaymentsTables()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = createBillingsPaymentsTables;
