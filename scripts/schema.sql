-- 클래빗 멀티 테넌트 데이터베이스 스키마

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL COMMENT '이메일',
  password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt)',
  name VARCHAR(100) NOT NULL COMMENT '이름',
  phone VARCHAR(20) COMMENT '연락처',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 정보';

-- 학원 테이블
CREATE TABLE IF NOT EXISTS academies (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(200) NOT NULL,
  registration_number VARCHAR(50) NOT NULL,
  business_number VARCHAR(50) NOT NULL,

  -- 서류 파일 경로
  registration_cert_path VARCHAR(500),
  business_cert_path VARCHAR(500),

  -- OCR 검증 상태
  verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending',
  verification_message TEXT,

  -- 기타 정보
  address TEXT,
  phone VARCHAR(20),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_registration (registration_number),
  INDEX idx_business (business_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사용자-학원 관계 테이블
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 학생 테이블 (기존 테이블이 있으면 수정, 없으면 생성)
CREATE TABLE IF NOT EXISTS students (
  id INT PRIMARY KEY AUTO_INCREMENT,
  academy_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  birth_date DATE,
  school VARCHAR(100),
  grade VARCHAR(20),
  student_phone VARCHAR(20),
  parent_phone VARCHAR(20),
  address TEXT,
  memo TEXT,
  enrollment_date DATE,
  withdrawal_date DATE,
  status ENUM('active', 'withdrawn', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
  INDEX idx_academy (academy_id),
  INDEX idx_name (name),
  INDEX idx_status (status),
  INDEX idx_enrollment_date (enrollment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
