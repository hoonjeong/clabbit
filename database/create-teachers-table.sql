-- 강사 테이블 생성
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    name VARCHAR(50) NOT NULL COMMENT '강사 이름',
    phone VARCHAR(20) NOT NULL COMMENT '핸드폰 번호',
    email VARCHAR(100) NOT NULL COMMENT '이메일 주소',
    address VARCHAR(200) COMMENT '주소',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',

    -- 인덱스
    INDEX idx_academy_id (academy_id),
    INDEX idx_name (name),
    INDEX idx_email (email),

    -- 외래키
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='강사 정보';
