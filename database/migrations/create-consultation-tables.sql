-- ============================================
-- 상담 관리 시스템 데이터베이스 스키마
-- ============================================

-- 상담 분류 테이블
CREATE TABLE IF NOT EXISTS consultation_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    category_name VARCHAR(50) NOT NULL COMMENT '상담 분류명',
    category_type VARCHAR(20) NOT NULL COMMENT '분류 유형 (신규/재원/퇴원/정기 등)',
    description TEXT COMMENT '설명',
    color VARCHAR(20) COMMENT '표시 색상',
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0 COMMENT '정렬 순서',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    INDEX idx_category_type (category_type),
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='상담 분류';

-- 상담 기록 테이블
CREATE TABLE IF NOT EXISTS consultations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    category_id INT NOT NULL,
    consultation_date DATE NOT NULL COMMENT '상담 일자',
    consultation_time TIME COMMENT '상담 시간',
    consultant_id INT NOT NULL COMMENT '상담자 ID (교사)',
    consultation_method VARCHAR(20) COMMENT '상담 방법 (대면/전화/앱/기타)',
    consultation_purpose TEXT COMMENT '상담 목적',
    consultation_content TEXT NOT NULL COMMENT '상담 내용',
    consultation_result TEXT COMMENT '처리 결과',
    parent_feedback TEXT COMMENT '학부모 피드백',
    follow_up_required BOOLEAN DEFAULT FALSE COMMENT '추가 상담 필요 여부',
    follow_up_date DATE COMMENT '추가 상담 예정일',
    status VARCHAR(20) DEFAULT 'completed' COMMENT '상담 상태 (scheduled/completed/cancelled)',
    is_important BOOLEAN DEFAULT FALSE COMMENT '중요 표시',
    attachments JSON COMMENT '첨부 파일 정보',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES consultation_categories(id),
    FOREIGN KEY (consultant_id) REFERENCES users(id),
    INDEX idx_student_id (student_id),
    INDEX idx_consultation_date (consultation_date),
    INDEX idx_consultant_id (consultant_id),
    INDEX idx_category_id (category_id),
    INDEX idx_status (status),
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='상담 기록';

-- 상담톡 (1:1 메시지) 테이블
CREATE TABLE IF NOT EXISTS consultation_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    consultation_id INT COMMENT '관련 상담 ID (선택)',
    student_id INT NOT NULL,
    sender_id INT NOT NULL COMMENT '발신자 ID',
    sender_type VARCHAR(20) NOT NULL COMMENT '발신자 유형 (teacher/parent/student)',
    receiver_id INT NOT NULL COMMENT '수신자 ID',
    receiver_type VARCHAR(20) NOT NULL COMMENT '수신자 유형',
    message_content TEXT NOT NULL COMMENT '메시지 내용',
    message_type VARCHAR(20) DEFAULT 'text' COMMENT '메시지 유형 (text/image/file)',
    attachment_url VARCHAR(255) COMMENT '첨부 파일 URL',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    read_at TIMESTAMP NULL COMMENT '읽은 시간',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE SET NULL,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_id (student_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_sent_at (sent_at),
    INDEX idx_academy_id (academy_id),
    INDEX idx_is_read (is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='상담톡 메시지';

-- 상담 템플릿 테이블
CREATE TABLE IF NOT EXISTS consultation_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    category_id INT,
    template_content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES consultation_categories(id) ON DELETE SET NULL,
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='상담 템플릿';

-- 상담 파일 첨부 테이블
CREATE TABLE IF NOT EXISTS consultation_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    consultation_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    file_type VARCHAR(100),
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_consultation_id (consultation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='상담 첨부 파일';

-- 상담 통계 뷰
CREATE OR REPLACE VIEW consultation_statistics AS
SELECT
    c.academy_id,
    c.consultant_id,
    u.name AS consultant_name,
    DATE_FORMAT(c.consultation_date, '%Y-%m') AS month,
    COUNT(*) AS total_consultations,
    COUNT(CASE WHEN c.follow_up_required = TRUE THEN 1 END) AS follow_up_required_count,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) AS completed_count,
    COUNT(CASE WHEN c.status = 'scheduled' THEN 1 END) AS scheduled_count,
    COUNT(CASE WHEN c.status = 'cancelled' THEN 1 END) AS cancelled_count,
    COUNT(CASE WHEN c.is_important = TRUE THEN 1 END) AS important_count
FROM consultations c
LEFT JOIN users u ON c.consultant_id = u.id
GROUP BY c.academy_id, c.consultant_id, DATE_FORMAT(c.consultation_date, '%Y-%m');

-- 학생별 상담 이력 뷰
CREATE OR REPLACE VIEW student_consultation_history AS
SELECT
    c.id,
    c.academy_id,
    c.student_id,
    s.name AS student_name,
    s.grade,
    c.consultation_date,
    c.consultation_time,
    cat.category_name,
    cat.category_type,
    u.name AS consultant_name,
    c.consultation_method,
    c.status,
    c.is_important,
    c.follow_up_required,
    c.follow_up_date
FROM consultations c
JOIN students s ON c.student_id = s.id
JOIN consultation_categories cat ON c.category_id = cat.id
JOIN users u ON c.consultant_id = u.id
ORDER BY c.consultation_date DESC;

-- 미상담자 조회 뷰
CREATE OR REPLACE VIEW pending_consultations AS
SELECT
    s.id AS student_id,
    s.academy_id,
    s.name AS student_name,
    s.grade,
    s.phone,
    s.parent_phone,
    MAX(c.consultation_date) AS last_consultation_date,
    DATEDIFF(CURDATE(), MAX(c.consultation_date)) AS days_since_last_consultation
FROM students s
LEFT JOIN consultations c ON s.id = c.student_id AND c.status = 'completed'
WHERE s.status = 'active'
GROUP BY s.id
HAVING last_consultation_date IS NULL OR DATEDIFF(CURDATE(), last_consultation_date) > 30;

-- 기본 상담 분류 데이터 삽입 (학원별로 생성되도록 수정 필요)
-- 이 부분은 학원 생성 시 실행되도록 별도 처리
/*
INSERT INTO consultation_categories (academy_id, category_name, category_type, display_order, color) VALUES
(1, '신규 학생 상담', '신규', 1, '#4CAF50'),
(1, '정기 상담', '재원', 2, '#2196F3'),
(1, '성적 상담', '재원', 3, '#FF9800'),
(1, '학습 태도 상담', '재원', 4, '#9C27B0'),
(1, '진로 상담', '재원', 5, '#00BCD4'),
(1, '수강 변경 상담', '재원', 6, '#FFEB3B'),
(1, '퇴원 상담', '퇴원', 7, '#F44336'),
(1, '학부모 요청 상담', '기타', 8, '#607D8B');
*/