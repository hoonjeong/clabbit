const db = require('../src/config/database');

async function migrateAcademySystem() {
  try {
    console.log('🔄 학원 멀티 테넌트 시스템 마이그레이션 시작...\n');

    // 1. academies 테이블 생성
    console.log('1️⃣ academies 테이블 생성 중...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS academies (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(200) NOT NULL,
        registration_number VARCHAR(50) NOT NULL,
        business_number VARCHAR(50) NOT NULL,
        registration_cert_path VARCHAR(500),
        business_cert_path VARCHAR(500),
        verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending',
        verification_message TEXT,
        address TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_registration (registration_number),
        INDEX idx_business (business_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ academies 테이블 생성 완료\n');

    // 2. user_academy_roles 테이블 생성
    console.log('2️⃣ user_academy_roles 테이블 생성 중...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_academy_roles (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        academy_id INT NOT NULL,
        role ENUM('owner', 'admin', 'teacher', 'staff') DEFAULT 'owner',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_academy (user_id, academy_id),
        INDEX idx_user (user_id),
        INDEX idx_academy (academy_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ user_academy_roles 테이블 생성 완료\n');

    // 3. students 테이블에 academy_id 컬럼 추가
    console.log('3️⃣ students 테이블에 academy_id 컬럼 추가 중...');
    try {
      await db.query('ALTER TABLE students ADD COLUMN academy_id INT AFTER id');
      console.log('✅ academy_id 컬럼 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️ academy_id 컬럼이 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    // 4. 기존 students 데이터 확인 및 마이그레이션
    console.log('\n4️⃣ 기존 학생 데이터 확인 중...');
    const [[{ studentCount }]] = await db.query(
      'SELECT COUNT(*) as studentCount FROM students WHERE academy_id IS NULL OR academy_id = 0'
    );

    if (studentCount > 0) {
      console.log(`📊 마이그레이션 필요한 학생 수: ${studentCount}명`);

      // 기본 학원 생성
      console.log('🏫 기본 학원 생성 중...');
      const [result] = await db.query(`
        INSERT INTO academies (name, registration_number, business_number, verification_status, verification_message)
        VALUES ('기본 학원', '임시등록번호', '000-00-00000', 'verified', '마이그레이션으로 생성된 기본 학원')
      `);

      const defaultAcademyId = result.insertId;
      console.log(`✅ 기본 학원 생성 완료 (ID: ${defaultAcademyId})`);

      // 기존 학생들을 기본 학원에 할당
      await db.query(
        'UPDATE students SET academy_id = ? WHERE academy_id IS NULL OR academy_id = 0',
        [defaultAcademyId]
      );
      console.log(`✅ ${studentCount}명의 학생을 기본 학원에 할당 완료`);

      // 기존 사용자들을 기본 학원 소유자로 설정
      console.log('👤 기존 사용자들을 학원 소유자로 설정 중...');
      const [users] = await db.query('SELECT id FROM users');

      for (const user of users) {
        try {
          await db.query(
            'INSERT INTO user_academy_roles (user_id, academy_id, role) VALUES (?, ?, "owner")',
            [user.id, defaultAcademyId]
          );
        } catch (error) {
          if (error.code !== 'ER_DUP_ENTRY') {
            console.error(`사용자 ${user.id} 권한 설정 오류:`, error.message);
          }
        }
      }
      console.log(`✅ ${users.length}명의 사용자를 학원 소유자로 설정 완료`);
    } else {
      console.log('✅ 마이그레이션 필요한 데이터 없음');
    }

    // 5. Foreign Key 제약조건 추가
    console.log('\n5️⃣ Foreign Key 제약조건 추가 중...');
    try {
      await db.query(`
        ALTER TABLE students
        ADD CONSTRAINT fk_students_academy
        FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign Key 제약조건 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ Foreign Key 제약조건이 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    // 6. 인덱스 추가
    console.log('\n6️⃣ 인덱스 추가 중...');
    try {
      await db.query('ALTER TABLE students ADD INDEX idx_academy (academy_id)');
      console.log('✅ 인덱스 추가 완료');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️ 인덱스가 이미 존재합니다.');
      } else {
        throw error;
      }
    }

    console.log('\n✅ 마이그레이션 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. .env 파일에 SESSION_SECRET 추가');
    console.log('   2. npm start로 서버 실행');
    console.log('   3. /academies/select 페이지에서 학원 관리');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ 마이그레이션 오류:', error);
    process.exit(1);
  }
}

// 실행
migrateAcademySystem();
