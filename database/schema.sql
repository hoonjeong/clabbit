-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS clabbit DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE clabbit;

-- 회원 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_name VARCHAR(100) NOT NULL COMMENT '학원명',
    owner_name VARCHAR(50) NOT NULL COMMENT '원장님 성함',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT '이메일',
    phone VARCHAR(20) NOT NULL COMMENT '연락처',
    password VARCHAR(40) NOT NULL COMMENT '비밀번호 (SHA1)',
    agree_terms BOOLEAN DEFAULT TRUE COMMENT '이용약관 동의',
    agree_marketing BOOLEAN DEFAULT FALSE COMMENT '마케팅 정보 수신 동의',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='회원 정보';
