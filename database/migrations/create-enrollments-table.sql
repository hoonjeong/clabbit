-- 수강 등록 테이블 생성
-- 학생과 수업을 연결하는 중간 테이블

USE clabbit;

CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL COMMENT '학생 ID',
    class_id INT NOT NULL COMMENT '수업 ID',
    start_date DATE NOT NULL COMMENT '수강 시작일',
    first_month_fee DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '첫 달 원비',
    status ENUM('active', 'completed', 'withdrawn') DEFAULT 'active' COMMENT '수강 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

    -- 인덱스
    INDEX idx_student_id (student_id),
    INDEX idx_class_id (class_id),
    INDEX idx_status (status),
    INDEX idx_student_class (student_id, class_id),

    -- 외래키 제약조건
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,

    -- 중복 등록 방지 (같은 학생이 같은 수업에 active 상태로 중복 등록 불가)
    UNIQUE KEY unique_active_enrollment (student_id, class_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수강 등록 정보';
