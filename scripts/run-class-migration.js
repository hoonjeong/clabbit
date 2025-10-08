/**
 * 수업 테이블 마이그레이션 스크립트
 * 새로운 필드 추가: schedule_day, schedule_hour, schedule_minute, payment_cycle, payment_week_interval
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function runMigration() {
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

    // 1. schedule_day 컬럼 추가
    console.log('\n1. schedule_day 컬럼 추가 중...');
    try {
      await connection.query(`
        ALTER TABLE classes
        ADD COLUMN schedule_day VARCHAR(20) COMMENT '수업 요일 (월/화/수/목/금/토/일)' AFTER schedule
      `);
      console.log('   ✓ schedule_day 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠ schedule_day 이미 존재');
      } else {
        throw error;
      }
    }

    // 2. schedule_hour 컬럼 추가
    console.log('2. schedule_hour 컬럼 추가 중...');
    try {
      await connection.query(`
        ALTER TABLE classes
        ADD COLUMN schedule_hour INT COMMENT '수업 시간 (9-22)' AFTER schedule_day
      `);
      console.log('   ✓ schedule_hour 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠ schedule_hour 이미 존재');
      } else {
        throw error;
      }
    }

    // 3. schedule_minute 컬럼 추가
    console.log('3. schedule_minute 컬럼 추가 중...');
    try {
      await connection.query(`
        ALTER TABLE classes
        ADD COLUMN schedule_minute INT COMMENT '수업 분 (0,5,10...55)' AFTER schedule_hour
      `);
      console.log('   ✓ schedule_minute 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠ schedule_minute 이미 존재');
      } else {
        throw error;
      }
    }

    // 4. payment_cycle 컬럼 추가
    console.log('4. payment_cycle 컬럼 추가 중...');
    try {
      await connection.query(`
        ALTER TABLE classes
        ADD COLUMN payment_cycle ENUM('monthly', 'weekly') DEFAULT 'monthly' COMMENT '결제 주기' AFTER description
      `);
      console.log('   ✓ payment_cycle 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠ payment_cycle 이미 존재');
      } else {
        throw error;
      }
    }

    // 5. payment_week_interval 컬럼 추가
    console.log('5. payment_week_interval 컬럼 추가 중...');
    try {
      await connection.query(`
        ALTER TABLE classes
        ADD COLUMN payment_week_interval INT DEFAULT NULL COMMENT '주 단위 결제 간격 (weekly인 경우)' AFTER payment_cycle
      `);
      console.log('   ✓ payment_week_interval 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('   ⚠ payment_week_interval 이미 존재');
      } else {
        throw error;
      }
    }

    // 6. 인덱스 추가
    console.log('6. 인덱스 추가 중...');
    try {
      await connection.query(`
        ALTER TABLE classes
        ADD INDEX idx_payment_cycle (payment_cycle)
      `);
      console.log('   ✓ idx_payment_cycle 인덱스 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('   ⚠ idx_payment_cycle 인덱스 이미 존재');
      } else {
        throw error;
      }
    }

    // 7. 테이블 구조 확인
    console.log('\n7. 테이블 구조 확인 중...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'classes'
      AND COLUMN_NAME IN ('schedule_day', 'schedule_hour', 'schedule_minute', 'payment_cycle', 'payment_week_interval')
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);

    console.log('\n   추가된 컬럼:');
    console.table(columns);

    console.log('\n✅ 마이그레이션 완료!');
    console.log('\n다음 단계:');
    console.log('1. 서버 재시작: npm start');
    console.log('2. 수업 추가 페이지 테스트: /classes/new');

  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error.message);
    console.error('상세 오류:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
runMigration();
