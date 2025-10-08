-- 수업(클래스) 테이블 생성
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    class_name VARCHAR(100) NOT NULL COMMENT '수업 이름',
    tuition INT NOT NULL DEFAULT 0 COMMENT '수강료',
    schedule VARCHAR(200) COMMENT '수업 시간 (요일 + 시간)',
    teacher_id INT COMMENT '담당강사 ID',
    teacher_name VARCHAR(50) COMMENT '담당강사 이름',
    grade VARCHAR(20) COMMENT '학년 (초등/중등/고등 등)',
    capacity INT COMMENT '정원',
    current_students INT DEFAULT 0 COMMENT '현재 학생 수',
    description TEXT COMMENT '수업 설명',
    start_date DATE NOT NULL COMMENT '시작일',
    end_date DATE COMMENT '종료일',
    status ENUM('active', 'completed') DEFAULT 'active' COMMENT '상태 (진행중/종강)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

    -- 인덱스
    INDEX idx_academy_id (academy_id),
    INDEX idx_status (status),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_grade (grade),
    INDEX idx_start_date (start_date),

    -- 외래키
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 정보';
