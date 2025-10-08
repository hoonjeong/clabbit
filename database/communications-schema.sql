-- 소통 관리 및 수업 관리 데이터베이스 스키마
-- 실행: mysql -u [user] -p [database] < communications-schema.sql

USE clabbit;

-- ============================================
-- 소통 관리 테이블
-- ============================================

-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    author_id INT NOT NULL COMMENT '작성자 ID',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    content TEXT NOT NULL COMMENT '내용',
    priority ENUM('normal', 'high', 'urgent') DEFAULT 'normal' COMMENT '우선순위',
    target_type ENUM('all', 'students', 'teachers', 'parents', 'custom') DEFAULT 'all' COMMENT '대상',
    target_ids TEXT COMMENT '맞춤 대상 ID 목록 (JSON)',
    is_pinned BOOLEAN DEFAULT FALSE COMMENT '상단 고정 여부',
    views INT DEFAULT 0 COMMENT '조회수',
    published_at TIMESTAMP NULL COMMENT '발행일시',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

    INDEX idx_academy_id (academy_id),
    INDEX idx_author_id (author_id),
    INDEX idx_published_at (published_at),
    INDEX idx_priority (priority),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공지사항';

-- 공지사항 첨부파일 테이블
CREATE TABLE IF NOT EXISTS announcement_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL COMMENT '공지사항 ID',
    file_name VARCHAR(255) NOT NULL COMMENT '파일명',
    file_path VARCHAR(500) NOT NULL COMMENT '파일 경로',
    file_type VARCHAR(50) NOT NULL COMMENT '파일 타입',
    file_size INT NOT NULL COMMENT '파일 크기 (bytes)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '업로드일시',

    INDEX idx_announcement_id (announcement_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공지사항 첨부파일';

-- 공지사항 읽음 상태 테이블
CREATE TABLE IF NOT EXISTS announcement_reads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL COMMENT '공지사항 ID',
    user_id INT NOT NULL COMMENT '사용자 ID',
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '읽은 시간',

    UNIQUE KEY uk_announcement_user (announcement_id, user_id),
    INDEX idx_announcement_id (announcement_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공지사항 읽음 상태';

-- 개별 메시지 대화방 테이블
CREATE TABLE IF NOT EXISTS message_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NULL COMMENT '학생 ID (학생-학원 대화)',
    title VARCHAR(200) NULL COMMENT '대화방 제목',
    conversation_type ENUM('teacher-student', 'teacher-parent', 'group') DEFAULT 'teacher-student' COMMENT '대화 유형',
    created_by INT NOT NULL COMMENT '생성자 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '최근 메시지 시간',
    last_message_at TIMESTAMP NULL COMMENT '마지막 메시지 시간',

    INDEX idx_academy_id (academy_id),
    INDEX idx_student_id (student_id),
    INDEX idx_created_by (created_by),
    INDEX idx_updated_at (updated_at),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지 대화방';

-- 대화방 참여자 테이블
CREATE TABLE IF NOT EXISTS conversation_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL COMMENT '대화방 ID',
    user_id INT NOT NULL COMMENT '사용자 ID',
    user_type ENUM('teacher', 'parent', 'student') NOT NULL COMMENT '사용자 유형',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '참여일시',
    last_read_at TIMESTAMP NULL COMMENT '마지막 읽은 시간',
    unread_count INT DEFAULT 0 COMMENT '읽지 않은 메시지 수',

    UNIQUE KEY uk_conversation_user (conversation_id, user_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_user_id (user_id),
    INDEX idx_unread (unread_count),
    FOREIGN KEY (conversation_id) REFERENCES message_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='대화방 참여자';

-- 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL COMMENT '대화방 ID',
    sender_id INT NOT NULL COMMENT '발신자 ID',
    sender_type ENUM('teacher', 'parent', 'student', 'system') NOT NULL COMMENT '발신자 유형',
    message_type ENUM('text', 'image', 'file', 'system') DEFAULT 'text' COMMENT '메시지 타입',
    content TEXT NOT NULL COMMENT '메시지 내용',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    read_at TIMESTAMP NULL COMMENT '읽은 시간',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',

    INDEX idx_conversation_id (conversation_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at),
    INDEX idx_is_read (is_read),
    FOREIGN KEY (conversation_id) REFERENCES message_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지';

-- 메시지 첨부파일 테이블
CREATE TABLE IF NOT EXISTS message_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    message_id INT NOT NULL COMMENT '메시지 ID',
    file_name VARCHAR(255) NOT NULL COMMENT '파일명',
    file_path VARCHAR(500) NOT NULL COMMENT '파일 경로',
    file_type VARCHAR(50) NOT NULL COMMENT '파일 타입',
    file_size INT NOT NULL COMMENT '파일 크기 (bytes)',
    thumbnail_path VARCHAR(500) NULL COMMENT '썸네일 경로 (이미지인 경우)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '업로드일시',

    INDEX idx_message_id (message_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지 첨부파일';

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    user_id INT NOT NULL COMMENT '수신자 ID',
    notification_type ENUM('announcement', 'message', 'schedule', 'payment', 'attendance', 'system') NOT NULL COMMENT '알림 타입',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    content TEXT NOT NULL COMMENT '내용',
    link_type VARCHAR(50) NULL COMMENT '링크 타입',
    link_id INT NULL COMMENT '연결된 리소스 ID',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    read_at TIMESTAMP NULL COMMENT '읽은 시간',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',

    INDEX idx_academy_id (academy_id),
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_notification_type (notification_type),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림';

-- ============================================
-- 수업 관리 테이블
-- ============================================

-- 수업 일정 테이블
CREATE TABLE IF NOT EXISTS class_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    class_id INT NULL COMMENT '클래스 ID',
    teacher_id INT NULL COMMENT '담당 선생님 ID',
    subject VARCHAR(100) NOT NULL COMMENT '과목',
    title VARCHAR(200) NOT NULL COMMENT '수업 제목',
    description TEXT NULL COMMENT '수업 설명',
    schedule_date DATE NOT NULL COMMENT '수업 날짜',
    start_time TIME NOT NULL COMMENT '시작 시간',
    end_time TIME NOT NULL COMMENT '종료 시간',
    room VARCHAR(50) NULL COMMENT '강의실',
    max_students INT NULL COMMENT '최대 인원',
    current_students INT DEFAULT 0 COMMENT '현재 인원',
    status ENUM('scheduled', 'ongoing', 'completed', 'cancelled') DEFAULT 'scheduled' COMMENT '상태',
    is_recurring BOOLEAN DEFAULT FALSE COMMENT '반복 여부',
    recurring_pattern VARCHAR(100) NULL COMMENT '반복 패턴 (JSON)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

    INDEX idx_academy_id (academy_id),
    INDEX idx_class_id (class_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_schedule_date (schedule_date),
    INDEX idx_status (status),
    INDEX idx_date_time (schedule_date, start_time),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 일정';

-- 수업 참여 학생 테이블
CREATE TABLE IF NOT EXISTS class_schedule_students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL COMMENT '수업 일정 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    enrollment_id INT NULL COMMENT '수강신청 ID',
    attendance_status ENUM('present', 'absent', 'late', 'pending') DEFAULT 'pending' COMMENT '출석 상태',
    attendance_time TIMESTAMP NULL COMMENT '출석 시간',
    notes TEXT NULL COMMENT '비고',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',

    UNIQUE KEY uk_schedule_student (schedule_id, student_id),
    INDEX idx_schedule_id (schedule_id),
    INDEX idx_student_id (student_id),
    INDEX idx_enrollment_id (enrollment_id),
    INDEX idx_attendance_status (attendance_status),
    FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 참여 학생';

-- 수업 자료 테이블
CREATE TABLE IF NOT EXISTS class_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    schedule_id INT NULL COMMENT '수업 일정 ID',
    teacher_id INT NOT NULL COMMENT '등록 선생님 ID',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    description TEXT NULL COMMENT '설명',
    material_type ENUM('document', 'video', 'audio', 'link', 'other') NOT NULL COMMENT '자료 타입',
    file_path VARCHAR(500) NULL COMMENT '파일 경로',
    file_name VARCHAR(255) NULL COMMENT '파일명',
    file_size INT NULL COMMENT '파일 크기 (bytes)',
    external_link VARCHAR(500) NULL COMMENT '외부 링크',
    is_public BOOLEAN DEFAULT TRUE COMMENT '공개 여부',
    download_count INT DEFAULT 0 COMMENT '다운로드 수',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

    INDEX idx_academy_id (academy_id),
    INDEX idx_schedule_id (schedule_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_material_type (material_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 자료';

-- 수업 과제 테이블
CREATE TABLE IF NOT EXISTS class_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    schedule_id INT NULL COMMENT '수업 일정 ID',
    teacher_id INT NOT NULL COMMENT '등록 선생님 ID',
    title VARCHAR(200) NOT NULL COMMENT '과제 제목',
    description TEXT NOT NULL COMMENT '과제 설명',
    due_date TIMESTAMP NULL COMMENT '제출 마감일',
    max_score INT NULL COMMENT '최대 점수',
    is_required BOOLEAN DEFAULT TRUE COMMENT '필수 여부',
    allow_late_submission BOOLEAN DEFAULT FALSE COMMENT '지각 제출 허용',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

    INDEX idx_academy_id (academy_id),
    INDEX idx_schedule_id (schedule_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_due_date (due_date),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE SET NULL,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 과제';

-- 과제 제출 테이블
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL COMMENT '과제 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    content TEXT NULL COMMENT '제출 내용',
    submission_status ENUM('submitted', 'late', 'graded', 'returned') DEFAULT 'submitted' COMMENT '제출 상태',
    score INT NULL COMMENT '점수',
    feedback TEXT NULL COMMENT '피드백',
    graded_by INT NULL COMMENT '채점자 ID',
    graded_at TIMESTAMP NULL COMMENT '채점일시',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '제출일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

    UNIQUE KEY uk_assignment_student (assignment_id, student_id),
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_student_id (student_id),
    INDEX idx_submission_status (submission_status),
    INDEX idx_submitted_at (submitted_at),
    FOREIGN KEY (assignment_id) REFERENCES class_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES teachers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='과제 제출';

-- 과제 제출 첨부파일 테이블
CREATE TABLE IF NOT EXISTS assignment_submission_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL COMMENT '제출 ID',
    file_name VARCHAR(255) NOT NULL COMMENT '파일명',
    file_path VARCHAR(500) NOT NULL COMMENT '파일 경로',
    file_type VARCHAR(50) NOT NULL COMMENT '파일 타입',
    file_size INT NOT NULL COMMENT '파일 크기 (bytes)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '업로드일시',

    INDEX idx_submission_id (submission_id),
    FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='과제 제출 첨부파일';

-- 수업 메모 테이블
CREATE TABLE IF NOT EXISTS class_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL COMMENT '수업 일정 ID',
    teacher_id INT NOT NULL COMMENT '작성 선생님 ID',
    student_id INT NULL COMMENT '학생 ID (개별 메모)',
    note_type ENUM('general', 'student_specific', 'homework', 'progress') DEFAULT 'general' COMMENT '메모 타입',
    content TEXT NOT NULL COMMENT '내용',
    is_private BOOLEAN DEFAULT FALSE COMMENT '비공개 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '작성일시',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',

    INDEX idx_schedule_id (schedule_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_student_id (student_id),
    INDEX idx_note_type (note_type),
    FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 메모';

-- 화상 수업 세션 테이블
CREATE TABLE IF NOT EXISTS video_class_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id INT NOT NULL COMMENT '수업 일정 ID',
    session_id VARCHAR(255) NOT NULL UNIQUE COMMENT '세션 ID',
    room_name VARCHAR(200) NOT NULL COMMENT '방 이름',
    meeting_url VARCHAR(500) NULL COMMENT '미팅 URL',
    password VARCHAR(50) NULL COMMENT '비밀번호',
    platform VARCHAR(50) DEFAULT 'custom' COMMENT '플랫폼 (custom, zoom, google-meet)',
    status ENUM('scheduled', 'active', 'ended') DEFAULT 'scheduled' COMMENT '상태',
    started_at TIMESTAMP NULL COMMENT '시작 시간',
    ended_at TIMESTAMP NULL COMMENT '종료 시간',
    recording_url VARCHAR(500) NULL COMMENT '녹화 URL',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일시',

    INDEX idx_schedule_id (schedule_id),
    INDEX idx_session_id (session_id),
    INDEX idx_status (status),
    FOREIGN KEY (schedule_id) REFERENCES class_schedules(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='화상 수업 세션';

-- 화상 수업 참여자 테이블
CREATE TABLE IF NOT EXISTS video_session_participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL COMMENT '세션 ID',
    user_id INT NOT NULL COMMENT '사용자 ID',
    user_type ENUM('teacher', 'student') NOT NULL COMMENT '사용자 유형',
    joined_at TIMESTAMP NULL COMMENT '입장 시간',
    left_at TIMESTAMP NULL COMMENT '퇴장 시간',
    duration INT DEFAULT 0 COMMENT '참여 시간 (초)',
    is_host BOOLEAN DEFAULT FALSE COMMENT '호스트 여부',

    INDEX idx_session_id (session_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (session_id) REFERENCES video_class_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='화상 수업 참여자';
