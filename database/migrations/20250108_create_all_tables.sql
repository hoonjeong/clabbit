-- =====================================
-- 클래빗 전체 데이터베이스 마이그레이션
-- 생성일: 2025-01-08
-- =====================================

-- 1. 알림 시스템 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    user_id INT,
    student_id INT,
    type ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    category VARCHAR(50),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'read') DEFAULT 'pending',
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    scheduled_at DATETIME,
    sent_at DATETIME,
    read_at DATETIME,
    error_message TEXT,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    INDEX idx_user_status (user_id, status),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_academy_created (academy_id, created_at)
);

-- 2. 알림 템플릿
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('email', 'sms', 'push') NOT NULL,
    category VARCHAR(50),
    subject VARCHAR(200),
    template_body TEXT NOT NULL,
    variables JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    UNIQUE KEY uk_academy_name (academy_id, name)
);

-- 3. 감사 로그 (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_academy_created (academy_id, created_at),
    INDEX idx_user_action (user_id, action),
    INDEX idx_table_record (table_name, record_id)
);

-- 4. 2단계 인증 (2FA)
CREATE TABLE IF NOT EXISTS two_factor_auth (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    secret VARCHAR(255) NOT NULL,
    backup_codes JSON,
    is_enabled BOOLEAN DEFAULT FALSE,
    last_used_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. 백업 기록
CREATE TABLE IF NOT EXISTS backup_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT,
    backup_type ENUM('full', 'incremental', 'differential') NOT NULL,
    backup_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    status ENUM('in_progress', 'completed', 'failed') DEFAULT 'in_progress',
    error_message TEXT,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    retention_days INT DEFAULT 30,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_academy_created (academy_id, created_at)
);

-- 6. 리포트 생성 기록
CREATE TABLE IF NOT EXISTS report_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    report_type VARCHAR(50) NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    parameters JSON,
    file_path VARCHAR(500),
    file_format ENUM('pdf', 'excel', 'csv', 'html') DEFAULT 'pdf',
    file_size INT,
    status ENUM('generating', 'completed', 'failed') DEFAULT 'generating',
    error_message TEXT,
    generated_by INT NOT NULL,
    accessed_count INT DEFAULT 0,
    last_accessed_at DATETIME,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (generated_by) REFERENCES users(id),
    INDEX idx_academy_user (academy_id, generated_by),
    INDEX idx_expires (expires_at)
);

-- 7. 시스템 설정
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT,
    category VARCHAR(50) NOT NULL,
    setting_key VARCHAR(100) NOT NULL,
    setting_value TEXT,
    value_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    UNIQUE KEY uk_academy_category_key (academy_id, category, setting_key)
);

-- 8. API 사용 로그
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT,
    user_id INT,
    api_key VARCHAR(100),
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    request_body TEXT,
    response_code INT,
    response_time_ms INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_academy_endpoint (academy_id, endpoint),
    INDEX idx_created_at (created_at)
);

-- 9. 화상 수업 세션
CREATE TABLE IF NOT EXISTS video_class_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    class_id INT,
    teacher_id INT NOT NULL,
    subject VARCHAR(100),
    scheduled_time DATETIME NOT NULL,
    duration_minutes INT,
    status ENUM('scheduled', 'live', 'ended', 'cancelled') DEFAULT 'scheduled',
    vimeo_event_id VARCHAR(255),
    vimeo_stream_key VARCHAR(255),
    vimeo_playback_url TEXT,
    agora_channel VARCHAR(255),
    password VARCHAR(50),
    max_participants INT DEFAULT 30,
    recording_enabled BOOLEAN DEFAULT TRUE,
    started_at DATETIME,
    ended_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    INDEX idx_academy_scheduled (academy_id, scheduled_time),
    INDEX idx_status (status)
);

-- 10. 화상 수업 참가자
CREATE TABLE IF NOT EXISTS video_class_participants (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    user_id INT NOT NULL,
    user_type ENUM('teacher', 'student', 'parent') NOT NULL,
    joined_at DATETIME NOT NULL,
    left_at DATETIME,
    duration_seconds INT,
    device_type VARCHAR(50),
    connection_quality ENUM('poor', 'fair', 'good', 'excellent'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_session_user (session_id, user_id)
);

-- 11. 화상 수업 녹화
CREATE TABLE IF NOT EXISTS video_class_recordings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id VARCHAR(100) NOT NULL,
    vimeo_video_id VARCHAR(255),
    title VARCHAR(255),
    url TEXT,
    embed_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INT,
    file_size_mb INT,
    view_count INT DEFAULT 0,
    is_public BOOLEAN DEFAULT FALSE,
    expires_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id)
);

-- 12. AI 숙제 도움 기록
CREATE TABLE IF NOT EXISTS homework_help_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    subject VARCHAR(50),
    problem_type VARCHAR(50),
    question TEXT NOT NULL,
    ai_solution TEXT,
    ai_explanation TEXT,
    step_by_step JSON,
    similar_problems JSON,
    student_answer TEXT,
    score INT,
    feedback TEXT,
    time_spent_seconds INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    INDEX idx_student_created (student_id, created_at),
    INDEX idx_subject_type (subject, problem_type)
);

-- 13. 자동 생성 시험
CREATE TABLE IF NOT EXISTS auto_generated_exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    exam_name VARCHAR(255) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    grade_level VARCHAR(20) NOT NULL,
    topics JSON,
    question_count INT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard', 'mixed') DEFAULT 'mixed',
    question_types JSON,
    duration_minutes INT,
    total_score INT DEFAULT 100,
    questions JSON,
    answer_key JSON,
    scoring_rubric JSON,
    generated_by INT NOT NULL,
    used_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (generated_by) REFERENCES users(id),
    INDEX idx_academy_subject (academy_id, subject),
    INDEX idx_grade_level (grade_level)
);

-- 14. 학생 시험 답안
CREATE TABLE IF NOT EXISTS student_exam_answers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exam_id INT NOT NULL,
    student_id INT NOT NULL,
    answers JSON,
    auto_score INT,
    manual_score INT,
    final_score INT,
    feedback TEXT,
    time_taken_seconds INT,
    submitted_at DATETIME,
    graded_at DATETIME,
    graded_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_id) REFERENCES auto_generated_exams(id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (graded_by) REFERENCES users(id),
    UNIQUE KEY uk_exam_student (exam_id, student_id),
    INDEX idx_student_submitted (student_id, submitted_at)
);

-- 15. 알림 구독 설정
CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    channel ENUM('email', 'sms', 'push', 'in_app') NOT NULL,
    category VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    frequency ENUM('instant', 'hourly', 'daily', 'weekly') DEFAULT 'instant',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uk_user_channel_category (user_id, channel, category)
);

-- 16. 시스템 성능 메트릭
CREATE TABLE IF NOT EXISTS system_metrics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(20, 4),
    unit VARCHAR(20),
    tags JSON,
    recorded_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type_name (metric_type, metric_name),
    INDEX idx_recorded (recorded_at)
);

-- 17. 에러 로그
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT,
    user_id INT,
    error_code VARCHAR(50),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    error_type VARCHAR(50),
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    context JSON,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at DATETIME,
    resolved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (academy_id) REFERENCES academies(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    INDEX idx_severity_resolved (severity, is_resolved),
    INDEX idx_created (created_at)
);

-- 뷰 생성

-- 활성 사용자 뷰
CREATE OR REPLACE VIEW active_users_view AS
SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    COUNT(DISTINCT al.id) as activity_count_30d,
    MAX(al.created_at) as last_activity,
    tfa.is_enabled as two_factor_enabled
FROM users u
LEFT JOIN audit_logs al ON u.id = al.user_id
    AND al.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
LEFT JOIN two_factor_auth tfa ON u.id = tfa.user_id
WHERE u.is_active = 1
GROUP BY u.id;

-- 일일 통계 뷰
CREATE OR REPLACE VIEW daily_statistics_view AS
SELECT
    DATE(created_at) as date,
    COUNT(DISTINCT CASE WHEN table_name = 'students' THEN record_id END) as new_students,
    COUNT(DISTINCT CASE WHEN table_name = 'payments' THEN record_id END) as payments_made,
    COUNT(DISTINCT CASE WHEN action = 'login' THEN user_id END) as unique_logins,
    COUNT(DISTINCT CASE WHEN table_name = 'video_class_sessions' THEN record_id END) as video_classes
FROM audit_logs
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(created_at);

-- 트리거 생성

-- 감사 로그 자동 생성 트리거
DELIMITER $$

CREATE TRIGGER after_student_insert
AFTER INSERT ON students
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (academy_id, user_id, action, table_name, record_id, new_values)
    VALUES (NEW.academy_id, @current_user_id, 'INSERT', 'students', NEW.id, JSON_OBJECT(
        'name', NEW.name,
        'grade', NEW.grade,
        'school', NEW.school
    ));
END$$

CREATE TRIGGER after_student_update
AFTER UPDATE ON students
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (academy_id, user_id, action, table_name, record_id, old_values, new_values)
    VALUES (NEW.academy_id, @current_user_id, 'UPDATE', 'students', NEW.id,
        JSON_OBJECT('name', OLD.name, 'grade', OLD.grade),
        JSON_OBJECT('name', NEW.name, 'grade', NEW.grade)
    );
END$$

-- 알림 자동 발송 트리거 (성적 등록 시)
CREATE TRIGGER after_score_insert
AFTER INSERT ON student_scores
FOR EACH ROW
BEGIN
    INSERT INTO notifications (academy_id, student_id, type, category, title, message)
    SELECT
        s.academy_id,
        NEW.student_id,
        'push',
        'score',
        CONCAT('새로운 시험 결과: ', e.exam_name),
        CONCAT('점수: ', NEW.raw_score, '/', e.total_score, ' (', NEW.percentage, '%)')
    FROM students s
    JOIN exams e ON NEW.exam_id = e.id
    WHERE s.id = NEW.student_id;
END$$

DELIMITER ;

-- 인덱스 최적화
CREATE INDEX idx_notifications_pending ON notifications(status, scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_audit_recent ON audit_logs(created_at DESC);
CREATE INDEX idx_api_usage_recent ON api_usage_logs(created_at DESC);

-- 초기 시스템 설정 데이터
INSERT INTO system_settings (academy_id, category, setting_key, setting_value, value_type, description) VALUES
(NULL, 'backup', 'auto_backup_enabled', 'true', 'boolean', '자동 백업 활성화'),
(NULL, 'backup', 'backup_time', '03:00', 'string', '백업 시작 시간'),
(NULL, 'backup', 'retention_days', '30', 'number', '백업 보관 기간(일)'),
(NULL, 'security', 'session_timeout_minutes', '60', 'number', '세션 타임아웃(분)'),
(NULL, 'security', 'max_login_attempts', '5', 'number', '최대 로그인 시도 횟수'),
(NULL, 'security', 'password_min_length', '8', 'number', '최소 비밀번호 길이'),
(NULL, 'notification', 'email_provider', 'smtp', 'string', '이메일 제공자'),
(NULL, 'notification', 'sms_provider', 'twilio', 'string', 'SMS 제공자');

-- 알림 템플릿 초기 데이터
INSERT INTO notification_templates (academy_id, name, type, category, subject, template_body, variables) VALUES
(1, 'welcome_email', 'email', 'registration', '{{academy_name}}에 오신 것을 환영합니다!',
 '안녕하세요 {{student_name}}님,\n\n{{academy_name}}에 등록해 주셔서 감사합니다.\n\n학원 정보:\n- 주소: {{academy_address}}\n- 연락처: {{academy_phone}}\n\n감사합니다.',
 '["student_name", "academy_name", "academy_address", "academy_phone"]'),
(1, 'payment_reminder', 'sms', 'payment', '수강료 납부 안내',
 '{{student_name}}님, {{month}}월 수강료 {{amount}}원이 미납되었습니다. {{due_date}}까지 납부 부탁드립니다. - {{academy_name}}',
 '["student_name", "month", "amount", "due_date", "academy_name"]'),
(1, 'class_reminder', 'push', 'class', '수업 시작 알림',
 '{{subject}} 수업이 {{time}}에 시작됩니다. {{room}}호실로 와주세요.',
 '["subject", "time", "room"]');

-- 권한 부여
GRANT SELECT, INSERT, UPDATE ON clabbit.* TO 'clabbit_user'@'localhost';
GRANT DELETE ON clabbit.audit_logs TO 'clabbit_admin'@'localhost';
GRANT EXECUTE ON clabbit.* TO 'clabbit_user'@'localhost';

-- 완료 메시지
SELECT '✅ 데이터베이스 마이그레이션 완료!' AS message;