const mysql = require('mysql2/promise');
require('dotenv').config();

async function createAcademyTables() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔄 학원 시스템 테이블 생성 시작...\n');

    // 1. academies 테이블 생성
    console.log('1️⃣ academies 테이블 생성 중...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS academies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL COMMENT '학원명',
        registration_number VARCHAR(50) NOT NULL COMMENT '학원등록번호',
        business_number VARCHAR(50) NOT NULL COMMENT '사업자등록번호',
        registration_cert_path VARCHAR(500) COMMENT '학원운영등록증 파일 경로',
        business_cert_path VARCHAR(500) COMMENT '사업자등록증 파일 경로',
        verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending' COMMENT 'OCR 검증 상태',
        verification_message TEXT COMMENT '검증 메시지',
        address TEXT COMMENT '주소',
        phone VARCHAR(20) COMMENT '연락처',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
        INDEX idx_registration (registration_number),
        INDEX idx_business (business_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학원 정보'
    `);
    console.log('✅ academies 테이블 생성 완료\n');

    // 2. user_academy_roles 테이블 생성
    console.log('2️⃣ user_academy_roles 테이블 생성 중...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_academy_roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL COMMENT '사용자 ID',
        academy_id INT NOT NULL COMMENT '학원 ID',
        role ENUM('owner', 'admin', 'teacher', 'staff') DEFAULT 'owner' COMMENT '역할',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_academy (user_id, academy_id),
        INDEX idx_user (user_id),
        INDEX idx_academy (academy_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자-학원 관계'
    `);
    console.log('✅ user_academy_roles 테이블 생성 완료\n');

    // 3. students 테이블에 academy_id 컬럼 추가 (있으면 스킵)
    console.log('3️⃣ students 테이블 확인 중...');
    const [columns] = await connection.query("SHOW COLUMNS FROM students");
    const columnNames = columns.map(col => col.Field);

    if (!columnNames.includes('academy_id')) {
      console.log('   academy_id 컬럼 추가 중...');
      await connection.query('ALTER TABLE students ADD COLUMN academy_id INT AFTER id');
      console.log('   ✅ academy_id 컬럼 추가 완료');

      // Foreign Key 추가
      console.log('   Foreign Key 제약조건 추가 중...');
      await connection.query(`
        ALTER TABLE students
        ADD CONSTRAINT fk_students_academy
        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
      `);
      console.log('   ✅ Foreign Key 추가 완료');

      // Index 추가
      console.log('   인덱스 추가 중...');
      await connection.query('ALTER TABLE students ADD INDEX idx_academy (academy_id)');
      console.log('   ✅ 인덱스 추가 완료');
    } else {
      console.log('   ✅ academy_id 컬럼이 이미 존재합니다');
    }

    console.log('\n4️⃣ 기존 students 데이터 확인 중...');
    const [[{ studentCount }]] = await connection.query(
      'SELECT COUNT(*) as studentCount FROM students WHERE academy_id IS NULL OR academy_id = 0'
    );

    if (studentCount > 0) {
      console.log(`   📊 마이그레이션 필요한 학생 수: ${studentCount}명`);

      // 기본 학원 생성
      console.log('   🏫 기본 학원 생성 중...');
      const [result] = await connection.query(`
        INSERT INTO academies (name, registration_number, business_number, verification_status, verification_message)
        VALUES ('기본 학원', '임시등록번호', '000-00-00000', 'verified', '마이그레이션으로 생성된 기본 학원')
      `);

      const defaultAcademyId = result.insertId;
      console.log(`   ✅ 기본 학원 생성 완료 (ID: ${defaultAcademyId})`);

      // 기존 학생들을 기본 학원에 할당
      await connection.query(
        'UPDATE students SET academy_id = ? WHERE academy_id IS NULL OR academy_id = 0',
        [defaultAcademyId]
      );
      console.log(`   ✅ ${studentCount}명의 학생을 기본 학원에 할당 완료`);

      // 기존 사용자들을 기본 학원 소유자로 설정
      console.log('   👤 기존 사용자들을 학원 소유자로 설정 중...');
      const [users] = await connection.query('SELECT id FROM users');

      for (const user of users) {
        try {
          await connection.query(
            'INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES (?, ?, "owner")',
            [user.id, defaultAcademyId]
          );
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') {
            console.error(`   사용자 ${user.id} 권한 설정 오류:`, error.message);
          }
        }
      }
      console.log(`   ✅ ${users.length}명의 사용자를 학원 소유자로 설정 완료`);
    } else {
      console.log('   ✅ 마이그레이션 필요한 데이터 없음');
    }

    // 5. 최종 구조 확인
    console.log('\n5️⃣ 최종 테이블 구조 확인:');

    console.log('\n📊 academies 테이블:');
    const [academyCols] = await connection.query('SHOW COLUMNS FROM academies');
    console.table(academyCols.map(col => ({
      컬럼명: col.Field,
      타입: col.Type,
      NULL: col.Null
    })));

    console.log('\n📊 user_academy_roles 테이블:');
    const [roleCols] = await connection.query('SHOW COLUMNS FROM user_academy_roles');
    console.table(roleCols.map(col => ({
      컬럼명: col.Field,
      타입: col.Type,
      NULL: col.Null
    })));

    console.log('\n✅ 학원 시스템 마이그레이션 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. .env 파일에 SESSION_SECRET 추가 확인');
    console.log('   2. npm start로 서버 재시작');
    console.log('   3. /academies/select 페이지에서 학원 관리\n');

    await connection.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 마이그레이션 오류:', error.message);
    if (connection) await connection.end();
    process.exit(1);
  }
}

createAcademyTables();
