-- ============================================
-- 성적 관리 시스템 데이터베이스 스키마
-- ============================================

-- 시험 정보 테이블
CREATE TABLE IF NOT EXISTS exams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    exam_name VARCHAR(100) NOT NULL COMMENT '시험명',
    exam_type VARCHAR(50) NOT NULL COMMENT '시험 종류 (내신, 모의고사, 단어시험 등)',
    exam_date DATE NOT NULL COMMENT '시험 일자',
    total_score INT NOT NULL DEFAULT 100 COMMENT '만점',
    grade_level VARCHAR(20) COMMENT '학년',
    subject VARCHAR(50) COMMENT '과목',
    class_id INT COMMENT '반 ID',
    description TEXT COMMENT '시험 설명',
    created_by INT COMMENT '생성자 ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE COMMENT '활성 상태',

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_exam_date (exam_date),
    INDEX idx_exam_type (exam_type),
    INDEX idx_grade_level (grade_level),
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='시험 정보';

-- 시험 문항 정보 테이블
CREATE TABLE IF NOT EXISTS exam_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    exam_id INT NOT NULL,
    question_number INT NOT NULL COMMENT '문항 번호',
    question_type VARCHAR(20) COMMENT '문항 유형 (객관식/주관식)',
    correct_answer VARCHAR(255) COMMENT '정답',
    score INT NOT NULL COMMENT '배점',
    difficulty VARCHAR(20) COMMENT '난이도 (상/중/하)',
    category VARCHAR(50) COMMENT '영역 (문법/어휘/독해 등)',

    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_exam_question (exam_id, question_number),
    INDEX idx_exam_id (exam_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='시험 문항 정보';

-- 학생 성적 테이블
CREATE TABLE IF NOT EXISTS student_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    exam_id INT NOT NULL,
    raw_score DECIMAL(5,2) NOT NULL COMMENT '원점수',
    percentage DECIMAL(5,2) COMMENT '백분율 점수',
    grade VARCHAR(10) COMMENT '등급 (1~9등급 또는 A~F)',
    rank_in_class INT COMMENT '학급 내 석차',
    rank_in_grade INT COMMENT '학년 내 석차',
    total_students_class INT COMMENT '학급 총 인원',
    total_students_grade INT COMMENT '학년 총 인원',
    submitted_at TIMESTAMP NULL COMMENT '제출 시간',
    graded_at TIMESTAMP NULL COMMENT '채점 시간',
    graded_by INT COMMENT '채점자 ID',
    notes TEXT COMMENT '특이사항',

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_student_exam (student_id, exam_id),
    INDEX idx_student_id (student_id),
    INDEX idx_exam_id (exam_id),
    INDEX idx_raw_score (raw_score),
    INDEX idx_grade (grade),
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='학생 성적';

-- 학생 답안 테이블
CREATE TABLE IF NOT EXISTS student_answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    score_id INT NOT NULL,
    question_id INT NOT NULL,
    student_answer VARCHAR(255) COMMENT '학생 답안',
    is_correct BOOLEAN DEFAULT FALSE COMMENT '정답 여부',
    score_earned DECIMAL(4,2) COMMENT '획득 점수',

    FOREIGN KEY (score_id) REFERENCES student_scores(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES exam_questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_score_question (score_id, question_id),
    INDEX idx_score_id (score_id),
    INDEX idx_question_id (question_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='학생 답안';

-- 영역별 성적 분석 테이블
CREATE TABLE IF NOT EXISTS score_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    score_id INT NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT '영역 (문법/어휘/독해 등)',
    total_questions INT COMMENT '총 문항 수',
    correct_answers INT COMMENT '정답 수',
    accuracy_rate DECIMAL(5,2) COMMENT '정답률',
    avg_difficulty DECIMAL(3,2) COMMENT '평균 난이도',

    FOREIGN KEY (score_id) REFERENCES student_scores(id) ON DELETE CASCADE,
    UNIQUE KEY unique_score_category (score_id, category),
    INDEX idx_score_id (score_id),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='영역별 성적 분석';

-- 성적 공유 이력 테이블
CREATE TABLE IF NOT EXISTS score_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    score_id INT NOT NULL,
    notification_type VARCHAR(20) NOT NULL COMMENT '알림 유형 (SMS/APP/EMAIL)',
    sent_to VARCHAR(100) COMMENT '수신자',
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE COMMENT '읽음 여부',
    read_at TIMESTAMP NULL COMMENT '읽은 시간',

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (score_id) REFERENCES student_scores(id) ON DELETE CASCADE,
    INDEX idx_score_id (score_id),
    INDEX idx_sent_at (sent_at),
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='성적 공유 이력';

-- 성적표 템플릿 테이블
CREATE TABLE IF NOT EXISTS score_report_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    academy_id INT NOT NULL,
    template_name VARCHAR(100) NOT NULL,
    template_type VARCHAR(50) DEFAULT 'standard' COMMENT '템플릿 유형',
    template_content JSON COMMENT '템플릿 구성 정보',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    INDEX idx_academy_id (academy_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='성적표 템플릿';

-- 트리거: 성적 입력 시 백분율 자동 계산
DELIMITER $$
CREATE TRIGGER calculate_percentage_before_insert
BEFORE INSERT ON student_scores
FOR EACH ROW
BEGIN
    DECLARE exam_total_score INT;

    SELECT total_score INTO exam_total_score
    FROM exams
    WHERE id = NEW.exam_id;

    IF exam_total_score > 0 THEN
        SET NEW.percentage = (NEW.raw_score / exam_total_score) * 100;
    END IF;
END$$

CREATE TRIGGER calculate_percentage_before_update
BEFORE UPDATE ON student_scores
FOR EACH ROW
BEGIN
    DECLARE exam_total_score INT;

    SELECT total_score INTO exam_total_score
    FROM exams
    WHERE id = NEW.exam_id;

    IF exam_total_score > 0 THEN
        SET NEW.percentage = (NEW.raw_score / exam_total_score) * 100;
    END IF;
END$$
DELIMITER ;

-- 성적 통계 뷰
CREATE OR REPLACE VIEW exam_statistics AS
SELECT
    e.id AS exam_id,
    e.academy_id,
    e.exam_name,
    e.exam_date,
    e.exam_type,
    e.grade_level,
    e.subject,
    COUNT(DISTINCT ss.student_id) AS total_students,
    AVG(ss.raw_score) AS avg_score,
    MAX(ss.raw_score) AS max_score,
    MIN(ss.raw_score) AS min_score,
    STD(ss.raw_score) AS std_deviation,
    AVG(ss.percentage) AS avg_percentage
FROM exams e
LEFT JOIN student_scores ss ON e.id = ss.exam_id
WHERE e.is_active = TRUE
GROUP BY e.id;

-- 학생별 성적 추이 뷰
CREATE OR REPLACE VIEW student_score_trends AS
SELECT
    ss.student_id,
    ss.academy_id,
    s.name AS student_name,
    e.subject,
    e.exam_date,
    ss.raw_score,
    ss.percentage,
    ss.grade,
    ss.rank_in_class,
    ss.rank_in_grade
FROM student_scores ss
JOIN students s ON ss.student_id = s.id
JOIN exams e ON ss.exam_id = e.id
ORDER BY ss.student_id, e.subject, e.exam_date;