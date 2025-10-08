-- ============================================
-- 클래빗(Clabbit) 학원 관리 시스템
-- 완전한 데이터베이스 스키마
-- ============================================

-- 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS clabbit DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE clabbit;

-- ============================================
-- 1. 사용자 및 학원 관리
-- ============================================

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE COMMENT '이메일',
    password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt)',
    name VARCHAR(50) NOT NULL COMMENT '이름',
    phone VARCHAR(20) COMMENT '연락처',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '가입일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    last_login_at TIMESTAMP NULL COMMENT '마지막 로그인',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자 정보';

-- 학원 테이블
CREATE TABLE IF NOT EXISTS academies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL COMMENT '학원명',
    registration_number VARCHAR(50) NOT NULL COMMENT '학원등록번호',
    business_number VARCHAR(50) NOT NULL COMMENT '사업자등록번호',
    registration_cert_path VARCHAR(500) COMMENT '학원운영등록증 파일 경로',
    business_cert_path VARCHAR(500) COMMENT '사업자등록증 파일 경로',
    verification_status ENUM('pending', 'verified', 'failed') DEFAULT 'pending' COMMENT 'OCR 검증 상태',
    verification_message TEXT COMMENT '검증 메시지',
    address TEXT COMMENT '주소',
    phone VARCHAR(20) COMMENT '연락처',
    email VARCHAR(100) COMMENT '이메일',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    INDEX idx_registration (registration_number),
    INDEX idx_business (business_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학원 정보';

-- 사용자-학원 관계 테이블
CREATE TABLE IF NOT EXISTS user_academy_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL COMMENT '사용자 ID',
    academy_id INT NOT NULL COMMENT '학원 ID',
    role ENUM('owner', 'admin', 'teacher', 'staff') DEFAULT 'owner' COMMENT '역할',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_academy (user_id, academy_id),
    INDEX idx_user (user_id),
    INDEX idx_academy (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='사용자-학원 관계';

-- ============================================
-- 2. 학생 관리
-- ============================================

-- 학생 테이블
CREATE TABLE IF NOT EXISTS students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    name VARCHAR(100) NOT NULL COMMENT '학생 이름',
    birth_date DATE COMMENT '생년월일',
    gender ENUM('male', 'female', 'other') COMMENT '성별',
    grade VARCHAR(20) COMMENT '학년',
    school VARCHAR(100) COMMENT '학교',
    phone VARCHAR(20) COMMENT '학생 연락처',
    parent_name VARCHAR(100) COMMENT '보호자 이름',
    parent_phone VARCHAR(20) COMMENT '보호자 연락처',
    parent_email VARCHAR(100) COMMENT '보호자 이메일',
    address TEXT COMMENT '주소',
    notes TEXT COMMENT '메모',
    status ENUM('active', 'withdrawn') DEFAULT 'active' COMMENT '상태',
    enrollment_date DATE COMMENT '입학일',
    withdrawal_date DATE COMMENT '퇴원일',
    withdrawal_reason TEXT COMMENT '퇴원 사유',
    photo_path VARCHAR(500) COMMENT '사진 경로',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_status (status),
    INDEX idx_name (name),
    INDEX idx_parent_phone (parent_phone),
    INDEX idx_enrollment_date (enrollment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학생 정보';

-- 학생 이벤트 테이블 (통계용)
CREATE TABLE IF NOT EXISTS student_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    event_type ENUM('join', 'rejoin', 'exit') NOT NULL COMMENT '이벤트 타입',
    event_date DATE NOT NULL COMMENT '이벤트 발생일',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_student_id (student_id),
    INDEX idx_event_type (event_type),
    INDEX idx_event_date (event_date),
    INDEX idx_academy_date (academy_id, event_date),
    INDEX idx_academy_type_date (academy_id, event_type, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학생 이벤트 기록';

-- ============================================
-- 3. 강사 관리
-- ============================================

-- 강사 테이블
CREATE TABLE IF NOT EXISTS teachers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    name VARCHAR(100) NOT NULL COMMENT '강사 이름',
    phone VARCHAR(20) COMMENT '연락처',
    email VARCHAR(100) COMMENT '이메일',
    address TEXT COMMENT '주소',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '등록일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='강사 정보';

-- ============================================
-- 4. 수업 관리
-- ============================================

-- 수업 테이블
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    class_name VARCHAR(200) NOT NULL COMMENT '수업명',
    grade VARCHAR(20) COMMENT '학년',
    subject VARCHAR(100) COMMENT '과목',
    teacher_id INT COMMENT '담당 강사 ID',
    teacher_name VARCHAR(100) COMMENT '담당 강사명',
    class_time VARCHAR(100) COMMENT '수업 시간',
    max_students INT DEFAULT 0 COMMENT '최대 정원',
    current_students INT DEFAULT 0 COMMENT '현재 인원',
    tuition DECIMAL(10, 2) DEFAULT 0 COMMENT '수강료',
    status ENUM('active', 'completed') DEFAULT 'active' COMMENT '상태',
    start_date DATE COMMENT '시작일',
    end_date DATE COMMENT '종료일',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    INDEX idx_academy_id (academy_id),
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_status (status),
    INDEX idx_grade (grade)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 정보';

-- 수강 신청 테이블
CREATE TABLE IF NOT EXISTS enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    class_id INT NOT NULL COMMENT '수업 ID',
    enrollment_date DATE NOT NULL COMMENT '수강 신청일',
    status ENUM('active', 'completed', 'dropped') DEFAULT 'active' COMMENT '상태',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_enrollment (student_id, class_id),
    INDEX idx_academy_id (academy_id),
    INDEX idx_student_id (student_id),
    INDEX idx_class_id (class_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수강 신청';

-- ============================================
-- 5. 출결 관리
-- ============================================

-- 출결 기록 테이블
CREATE TABLE IF NOT EXISTS attendance_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    class_id INT COMMENT '수업 ID',
    attendance_date DATE NOT NULL COMMENT '출결일',
    check_in_time TIME COMMENT '입실 시간',
    check_out_time TIME COMMENT '퇴실 시간',
    status ENUM('present', 'absent', 'late', 'excused') DEFAULT 'present' COMMENT '출결 상태',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_academy_id (academy_id),
    INDEX idx_student_id (student_id),
    INDEX idx_class_id (class_id),
    INDEX idx_attendance_date (attendance_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='출결 기록';

-- 학생 출결 설정 테이블
CREATE TABLE IF NOT EXISTS student_attendance_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    qr_code VARCHAR(255) UNIQUE COMMENT 'QR 코드',
    auto_notify BOOLEAN DEFAULT FALSE COMMENT '자동 알림 여부',
    parent_phone VARCHAR(20) COMMENT '알림 수신 번호',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_settings (academy_id, student_id),
    INDEX idx_qr_code (qr_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학생 출결 설정';

-- 보강 수업 테이블
CREATE TABLE IF NOT EXISTS makeup_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    class_id INT NOT NULL COMMENT '수업 ID',
    original_date DATE NOT NULL COMMENT '원래 수업일',
    makeup_date DATE COMMENT '보강 수업일',
    status ENUM('pending', 'scheduled', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '상태',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_student_id (student_id),
    INDEX idx_class_id (class_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='보강 수업';

-- ============================================
-- 6. 청구/수납 관리
-- ============================================

-- 청구 항목 테이블
CREATE TABLE IF NOT EXISTS billing_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    item_name VARCHAR(200) NOT NULL COMMENT '항목명',
    amount DECIMAL(10, 2) NOT NULL COMMENT '금액',
    item_type ENUM('tuition', 'material', 'exam', 'other') DEFAULT 'other' COMMENT '항목 유형',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_item_type (item_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='청구 항목';

-- 학생 청구 테이블
CREATE TABLE IF NOT EXISTS student_charges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    class_id INT COMMENT '수업 ID',
    billing_item_id INT COMMENT '청구 항목 ID',
    charge_date DATE NOT NULL COMMENT '청구일',
    due_date DATE NOT NULL COMMENT '납부 마감일',
    amount DECIMAL(10, 2) NOT NULL COMMENT '청구 금액',
    paid_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '납부 금액',
    discount_amount DECIMAL(10, 2) DEFAULT 0 COMMENT '할인 금액',
    status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'pending' COMMENT '상태',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (billing_item_id) REFERENCES billing_items(id) ON DELETE SET NULL,
    INDEX idx_academy_id (academy_id),
    INDEX idx_student_id (student_id),
    INDEX idx_charge_date (charge_date),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학생 청구';

-- 수납 기록 테이블
CREATE TABLE IF NOT EXISTS payment_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    charge_id INT NOT NULL COMMENT '청구 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    payment_date DATE NOT NULL COMMENT '납부일',
    amount DECIMAL(10, 2) NOT NULL COMMENT '납부 금액',
    payment_method ENUM('cash', 'card', 'transfer', 'other') DEFAULT 'cash' COMMENT '납부 방법',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (charge_id) REFERENCES student_charges(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_charge_id (charge_id),
    INDEX idx_student_id (student_id),
    INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수납 기록';

-- 할인 정책 테이블
CREATE TABLE IF NOT EXISTS discount_policies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    policy_name VARCHAR(200) NOT NULL COMMENT '정책명',
    discount_type ENUM('percentage', 'fixed') DEFAULT 'percentage' COMMENT '할인 유형',
    discount_value DECIMAL(10, 2) NOT NULL COMMENT '할인 값',
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='할인 정책';

-- 환불 기록 테이블
CREATE TABLE IF NOT EXISTS refund_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    payment_id INT NOT NULL COMMENT '수납 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    refund_date DATE NOT NULL COMMENT '환불일',
    amount DECIMAL(10, 2) NOT NULL COMMENT '환불 금액',
    reason TEXT COMMENT '환불 사유',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payment_records(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_payment_id (payment_id),
    INDEX idx_refund_date (refund_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='환불 기록';

-- ============================================
-- 7. 성적 관리
-- ============================================

-- 시험 테이블
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    class_id INT COMMENT '수업 ID',
    exam_name VARCHAR(200) NOT NULL COMMENT '시험명',
    exam_date DATE NOT NULL COMMENT '시험일',
    total_score INT DEFAULT 100 COMMENT '총점',
    exam_type ENUM('midterm', 'final', 'quiz', 'mock', 'other') DEFAULT 'other' COMMENT '시험 유형',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    INDEX idx_academy_id (academy_id),
    INDEX idx_class_id (class_id),
    INDEX idx_exam_date (exam_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='시험 정보';

-- 학생 성적 테이블
CREATE TABLE IF NOT EXISTS student_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    exam_id INT NOT NULL COMMENT '시험 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    score DECIMAL(5, 2) NOT NULL COMMENT '점수',
    grade VARCHAR(10) COMMENT '등급',
    rank_in_class INT COMMENT '반 순위',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_exam_student (exam_id, student_id),
    INDEX idx_academy_id (academy_id),
    INDEX idx_exam_id (exam_id),
    INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='학생 성적';

-- ============================================
-- 8. 상담 관리
-- ============================================

-- 상담 테이블
CREATE TABLE IF NOT EXISTS consultations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    teacher_id INT COMMENT '담당 강사 ID',
    consultation_date DATETIME NOT NULL COMMENT '상담일시',
    consultation_type ENUM('academic', 'career', 'behavioral', 'parent', 'other') DEFAULT 'academic' COMMENT '상담 유형',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    content TEXT COMMENT '내용',
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled' COMMENT '상태',
    is_parent_attended BOOLEAN DEFAULT FALSE COMMENT '학부모 참석 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    INDEX idx_academy_id (academy_id),
    INDEX idx_student_id (student_id),
    INDEX idx_consultation_date (consultation_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상담 기록';

-- 상담 메시지 테이블
CREATE TABLE IF NOT EXISTS consultation_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    consultation_id INT NOT NULL COMMENT '상담 ID',
    sender_type ENUM('teacher', 'parent', 'student') NOT NULL COMMENT '발신자 유형',
    sender_name VARCHAR(100) NOT NULL COMMENT '발신자 이름',
    message TEXT NOT NULL COMMENT '메시지',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_consultation_id (consultation_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='상담 메시지';

-- ============================================
-- 9. 소통 관리
-- ============================================

-- 공지사항 테이블
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    author_id INT NOT NULL COMMENT '작성자 ID',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    content TEXT NOT NULL COMMENT '내용',
    target_type ENUM('all', 'grade', 'class', 'student') DEFAULT 'all' COMMENT '대상 유형',
    target_ids JSON COMMENT '대상 ID 목록',
    is_important BOOLEAN DEFAULT FALSE COMMENT '중요 공지',
    is_published BOOLEAN DEFAULT TRUE COMMENT '게시 여부',
    published_at TIMESTAMP NULL COMMENT '게시일',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_published_at (published_at),
    INDEX idx_is_important (is_important)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='공지사항';

-- 메시지 대화 테이블
CREATE TABLE IF NOT EXISTS message_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    conversation_type ENUM('individual', 'group') DEFAULT 'individual' COMMENT '대화 유형',
    title VARCHAR(200) COMMENT '대화 제목',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지 대화';

-- 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    conversation_id INT NOT NULL COMMENT '대화 ID',
    sender_id INT NOT NULL COMMENT '발신자 ID',
    content TEXT NOT NULL COMMENT '내용',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES message_conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='메시지';

-- 알림 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    user_id INT NOT NULL COMMENT '사용자 ID',
    notification_type ENUM('payment', 'attendance', 'exam', 'announcement', 'system') NOT NULL COMMENT '알림 유형',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    content TEXT COMMENT '내용',
    reference_id INT COMMENT '참조 ID',
    reference_type VARCHAR(50) COMMENT '참조 유형',
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='알림';

-- ============================================
-- 10. 수업 관리 추가 기능
-- ============================================

-- 수업 일정 테이블
CREATE TABLE IF NOT EXISTS class_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    class_id INT NOT NULL COMMENT '수업 ID',
    schedule_date DATE NOT NULL COMMENT '수업일',
    start_time TIME NOT NULL COMMENT '시작 시간',
    end_time TIME NOT NULL COMMENT '종료 시간',
    topic VARCHAR(200) COMMENT '수업 주제',
    status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled' COMMENT '상태',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_class_id (class_id),
    INDEX idx_schedule_date (schedule_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 일정';

-- 수업 자료 테이블
CREATE TABLE IF NOT EXISTS class_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    class_id INT NOT NULL COMMENT '수업 ID',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    description TEXT COMMENT '설명',
    file_path VARCHAR(500) COMMENT '파일 경로',
    file_type VARCHAR(50) COMMENT '파일 유형',
    file_size INT COMMENT '파일 크기',
    upload_date DATE NOT NULL COMMENT '업로드일',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_class_id (class_id),
    INDEX idx_upload_date (upload_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='수업 자료';

-- 과제 테이블
CREATE TABLE IF NOT EXISTS class_assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    class_id INT NOT NULL COMMENT '수업 ID',
    title VARCHAR(200) NOT NULL COMMENT '제목',
    description TEXT COMMENT '설명',
    due_date DATE NOT NULL COMMENT '제출 마감일',
    max_score INT DEFAULT 100 COMMENT '만점',
    status ENUM('active', 'closed') DEFAULT 'active' COMMENT '상태',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id),
    INDEX idx_class_id (class_id),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='과제';

-- 과제 제출 테이블
CREATE TABLE IF NOT EXISTS assignment_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL COMMENT '학원 ID',
    assignment_id INT NOT NULL COMMENT '과제 ID',
    student_id INT NOT NULL COMMENT '학생 ID',
    submission_date DATETIME NOT NULL COMMENT '제출일시',
    content TEXT COMMENT '제출 내용',
    file_path VARCHAR(500) COMMENT '파일 경로',
    score INT COMMENT '점수',
    feedback TEXT COMMENT '피드백',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '생성일',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일',
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES class_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY unique_assignment_student (assignment_id, student_id),
    INDEX idx_academy_id (academy_id),
    INDEX idx_assignment_id (assignment_id),
    INDEX idx_student_id (student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='과제 제출';

-- ============================================
-- 완료!
-- ============================================
