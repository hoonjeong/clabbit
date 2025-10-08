/**
 * 학생 테이블에 enrollment_type 컬럼을 추가하는 마이그레이션 스크립트
 * 신규/재원 구분 기능을 위한 컬럼 추가
 */

require('dotenv').config();
const db = require('../src/config/database');

async function addEnrollmentTypeColumn() {
    const connection = await db.getConnection();

    try {
        console.log('🔄 enrollment_type 컬럼 추가 시작...');

        // 컬럼이 이미 존재하는지 확인
        const [columns] = await connection.execute(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'enrollment_type'
        `, [process.env.DB_NAME || 'clabbit']);

        if (columns.length > 0) {
            console.log('ℹ️ enrollment_type 컬럼이 이미 존재합니다.');
            return;
        }

        // enrollment_type 컬럼 추가
        await connection.execute(`
            ALTER TABLE students
            ADD COLUMN enrollment_type ENUM('new', 'returning') DEFAULT 'new'
            COMMENT '등록 유형 (new: 신규, returning: 재원)'
            AFTER enrollment_date
        `);
        console.log('✅ enrollment_type 컬럼 추가 완료');

        // 인덱스 추가
        await connection.execute(`
            ALTER TABLE students
            ADD INDEX idx_enrollment_type (enrollment_type)
        `);
        console.log('✅ enrollment_type 인덱스 추가 완료');

        // 기존 데이터 업데이트 (모든 기존 학생을 '신규'로 설정)
        const [updateResult] = await connection.execute(`
            UPDATE students
            SET enrollment_type = 'new'
            WHERE enrollment_type IS NULL
        `);
        console.log(`✅ ${updateResult.affectedRows}개의 기존 학생 데이터를 '신규'로 설정`);

        console.log('🎉 마이그레이션 완료!');

    } catch (error) {
        console.error('❌ 마이그레이션 실패:', error);
        throw error;
    } finally {
        connection.release();
        process.exit();
    }
}

// 스크립트 실행
addEnrollmentTypeColumn();