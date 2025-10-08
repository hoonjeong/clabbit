-- 출결 관리 시스템 테이블 생성
-- Phase 1: Core Tables

-- 1. 출결 기록 테이블
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in_time DATETIME,
    check_out_time DATETIME,
    status ENUM('present', 'absent', 'late', 'early_leave', 'makeup') DEFAULT 'present',
    check_in_method ENUM('kiosk', 'manual', 'app') DEFAULT 'kiosk',
    check_out_method ENUM('kiosk', 'manual', 'app'),
    notes TEXT,
    modified_by INT,
    modified_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (modified_by) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE KEY unique_student_date (academy_id, student_id, attendance_date),
    INDEX idx_academy_date (academy_id, attendance_date),
    INDEX idx_student_date (student_id, attendance_date),
    INDEX idx_date (attendance_date),
    INDEX idx_status (status),
    INDEX idx_check_in (check_in_time),
    INDEX idx_check_out (check_out_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 학생 출결 설정 테이블
CREATE TABLE IF NOT EXISTS student_attendance_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_code VARCHAR(10),  -- 고유 출결 번호
    phone_last_4 VARCHAR(4),  -- 학생 전화번호 뒷 4자리
    parent_phone_last_4 VARCHAR(4),  -- 학부모 전화번호 뒷 4자리
    total_sessions INT DEFAULT 0,  -- 횟수제: 총 수업 횟수
    remaining_sessions INT DEFAULT 0,  -- 횟수제: 남은 수업 횟수
    is_session_based BOOLEAN DEFAULT FALSE,  -- 횟수제 여부
    auto_notification BOOLEAN DEFAULT TRUE,  -- 자동 알림 여부
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,

    UNIQUE KEY unique_academy_student (academy_id, student_id),
    UNIQUE KEY unique_academy_code (academy_id, attendance_code),
    INDEX idx_attendance_code (attendance_code),
    INDEX idx_phone_last_4 (phone_last_4),
    INDEX idx_parent_phone_last_4 (parent_phone_last_4)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 출결 알림 로그 테이블
CREATE TABLE IF NOT EXISTS attendance_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    attendance_record_id INT NOT NULL,
    student_id INT NOT NULL,
    notification_type ENUM('sms', 'push', 'kakao', 'email') NOT NULL,
    recipient_phone VARCHAR(20),
    recipient_email VARCHAR(255),
    message_content TEXT,
    sent_at DATETIME,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (attendance_record_id) REFERENCES attendance_records(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,

    INDEX idx_academy (academy_id),
    INDEX idx_student (student_id),
    INDEX idx_sent_at (sent_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 보강 수업 테이블
CREATE TABLE IF NOT EXISTS makeup_classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    original_attendance_id INT NOT NULL,  -- 결석한 원래 출결 기록
    makeup_date DATE,
    makeup_time TIME,
    class_id INT,
    teacher_id INT,
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_by INT,
    completed_at DATETIME,
    cancelled_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (original_attendance_id) REFERENCES attendance_records(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_academy (academy_id),
    INDEX idx_student (student_id),
    INDEX idx_makeup_date (makeup_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 출결 통계 캐시 테이블 (성능 최적화용)
CREATE TABLE IF NOT EXISTS attendance_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    period_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    class_id INT,
    total_students INT DEFAULT 0,
    present_count INT DEFAULT 0,
    absent_count INT DEFAULT 0,
    late_count INT DEFAULT 0,
    early_leave_count INT DEFAULT 0,
    attendance_rate DECIMAL(5,2),
    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,

    UNIQUE KEY unique_period (academy_id, period_type, period_start, period_end, class_id),
    INDEX idx_academy (academy_id),
    INDEX idx_period (period_start, period_end),
    INDEX idx_class (class_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 학원 출결 설정 테이블
CREATE TABLE IF NOT EXISTS academy_attendance_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    enable_notifications BOOLEAN DEFAULT TRUE,
    notification_methods JSON,  -- ['sms', 'kakao', 'push']
    check_in_message_template TEXT,
    check_out_message_template TEXT,
    late_threshold_minutes INT DEFAULT 10,  -- 지각 기준 (분)
    early_leave_threshold_minutes INT DEFAULT 10,  -- 조퇴 기준 (분)
    default_check_in_time TIME DEFAULT '09:00:00',
    default_check_out_time TIME DEFAULT '18:00:00',
    kiosk_mode_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,

    UNIQUE KEY unique_academy (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 기본 설정 데이터 삽입 (학원별로 자동 생성)
DELIMITER $$
CREATE TRIGGER create_default_attendance_settings
AFTER INSERT ON academies
FOR EACH ROW
BEGIN
    INSERT INTO academy_attendance_settings (
        academy_id,
        enable_notifications,
        notification_methods,
        check_in_message_template,
        check_out_message_template
    ) VALUES (
        NEW.id,
        TRUE,
        '["sms"]',
        '[{academy_name}] {student_name}님이 {time}에 등원하였습니다.',
        '[{academy_name}] {student_name}님이 {time}에 하원하였습니다.'
    );
END$$
DELIMITER ;

-- 학생 등록시 출결 설정 자동 생성
DELIMITER $$
CREATE TRIGGER create_student_attendance_settings
AFTER INSERT ON students
FOR EACH ROW
BEGIN
    DECLARE phone_last VARCHAR(4);
    DECLARE parent_phone_last VARCHAR(4);
    DECLARE code VARCHAR(10);

    -- 전화번호 뒷 4자리 추출
    SET phone_last = IF(NEW.student_phone IS NOT NULL AND LENGTH(NEW.student_phone) >= 4,
                        RIGHT(REPLACE(NEW.student_phone, '-', ''), 4),
                        NULL);
    SET parent_phone_last = IF(NEW.parent_phone IS NOT NULL AND LENGTH(NEW.parent_phone) >= 4,
                               RIGHT(REPLACE(NEW.parent_phone, '-', ''), 4),
                               NULL);

    -- 고유 출결 코드 생성 (학원ID + 학생ID 조합)
    SET code = CONCAT(NEW.academy_id, LPAD(NEW.id, 4, '0'));

    INSERT INTO student_attendance_settings (
        academy_id,
        student_id,
        attendance_code,
        phone_last_4,
        parent_phone_last_4
    ) VALUES (
        NEW.academy_id,
        NEW.id,
        code,
        phone_last,
        parent_phone_last
    ) ON DUPLICATE KEY UPDATE
        phone_last_4 = VALUES(phone_last_4),
        parent_phone_last_4 = VALUES(parent_phone_last_4);
END$$
DELIMITER ;

-- 학생 정보 업데이트시 출결 설정도 업데이트
DELIMITER $$
CREATE TRIGGER update_student_attendance_settings
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
    DECLARE phone_last VARCHAR(4);
    DECLARE parent_phone_last VARCHAR(4);

    -- 전화번호 뒷 4자리 추출
    SET phone_last = IF(NEW.student_phone IS NOT NULL AND LENGTH(NEW.student_phone) >= 4,
                        RIGHT(REPLACE(NEW.student_phone, '-', ''), 4),
                        NULL);
    SET parent_phone_last = IF(NEW.parent_phone IS NOT NULL AND LENGTH(NEW.parent_phone) >= 4,
                               RIGHT(REPLACE(NEW.parent_phone, '-', ''), 4),
                               NULL);

    UPDATE student_attendance_settings
    SET phone_last_4 = phone_last,
        parent_phone_last_4 = parent_phone_last,
        updated_at = NOW()
    WHERE student_id = NEW.id AND academy_id = NEW.academy_id;
END$$
DELIMITER ;