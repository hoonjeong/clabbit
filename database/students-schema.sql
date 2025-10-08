-- 학생 테이블 생성
USE clabbit;

CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL COMMENT '학생 이름',
    birth_date DATE NOT NULL COMMENT '생년월일',
    school VARCHAR(100) COMMENT '학교명',
    grade VARCHAR(20) COMMENT '학년',
    student_phone VARCHAR(20) COMMENT '학생 전화번호',
    parent_phone VARCHAR(20) NOT NULL COMMENT '학부모 전화번호',
    address TEXT COMMENT '주소',
    memo TEXT COMMENT '메모',
    enrollment_date DATE NOT NULL COMMENT '신규 가입일',
    withdrawal_date DATE COMMENT '퇴원일',
    status ENUM('active', 'withdrawn') DEFAULT 'active' COMMENT '재원/퇴원 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '레코드 생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '레코드 수정일',
    INDEX idx_status (status),
    INDEX idx_name (name),
    INDEX idx_enrollment_date (enrollment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학생 정보';
