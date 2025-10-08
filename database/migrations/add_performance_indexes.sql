-- ========================================================
-- 데이터베이스 성능 개선을 위한 인덱스 추가
-- 작성일: 2025-01-08
-- ========================================================

USE clabbit;

-- ========================================================
-- 1. 학생 관련 인덱스
-- ========================================================

-- 학생 검색 성능 개선
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(phone);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX IF NOT EXISTS idx_students_academy_status ON students(academy_id, status);
CREATE INDEX IF NOT EXISTS idx_students_academy_created ON students(academy_id, created_at DESC);

-- 학생 이벤트 통계 조회 개선
CREATE INDEX IF NOT EXISTS idx_student_events_academy_type_date
    ON student_events(academy_id, event_type, event_date);
CREATE INDEX IF NOT EXISTS idx_student_events_student_date
    ON student_events(student_id, event_date DESC);

-- ========================================================
-- 2. 출석 관련 인덱스
-- ========================================================

-- 출석 조회 성능 개선
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date
    ON attendance_records(student_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_academy_date
    ON attendance_records(academy_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_class_date
    ON attendance_records(class_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_status
    ON attendance_records(academy_id, status, attendance_date);

-- ========================================================
-- 3. 수납/청구 관련 인덱스
-- ========================================================

-- 청구 조회 개선
CREATE INDEX IF NOT EXISTS idx_charges_student ON student_charges(student_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON student_charges(status);
CREATE INDEX IF NOT EXISTS idx_charges_due_date ON student_charges(due_date);
CREATE INDEX IF NOT EXISTS idx_charges_academy_status
    ON student_charges(academy_id, status, charge_date DESC);
CREATE INDEX IF NOT EXISTS idx_charges_academy_month
    ON student_charges(academy_id, charge_month);

-- 수납 조회 개선
CREATE INDEX IF NOT EXISTS idx_payments_charge ON payment_records(charge_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payment_records(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payment_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payment_records(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_academy_date
    ON payment_records(academy_id, payment_date DESC);

-- 환불 조회 개선
CREATE INDEX IF NOT EXISTS idx_refunds_payment ON refund_records(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refund_records(status);
CREATE INDEX IF NOT EXISTS idx_refunds_academy_date
    ON refund_records(academy_id, refund_date DESC);

-- ========================================================
-- 4. 수업 관련 인덱스
-- ========================================================

-- 수업 조회 개선
CREATE INDEX IF NOT EXISTS idx_classes_status ON classes(status);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_academy_status
    ON classes(academy_id, status);

-- 수강 등록 조회 개선
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_academy_status
    ON enrollments(academy_id, status);

-- 수업 일정 조회 개선
CREATE INDEX IF NOT EXISTS idx_schedules_class ON class_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_schedules_teacher ON class_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON class_schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_academy_date
    ON class_schedules(academy_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedules_status_date
    ON class_schedules(status, schedule_date);

-- ========================================================
-- 5. 성적 관련 인덱스
-- ========================================================

-- 시험 조회 개선
CREATE INDEX IF NOT EXISTS idx_exams_academy_date
    ON exams(academy_id, exam_date DESC);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);

-- 성적 조회 개선
CREATE INDEX IF NOT EXISTS idx_scores_student ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_exam ON student_scores(exam_id);
CREATE INDEX IF NOT EXISTS idx_scores_academy_student
    ON student_scores(academy_id, student_id);
CREATE INDEX IF NOT EXISTS idx_scores_exam_rank
    ON student_scores(exam_id, total_score DESC);

-- ========================================================
-- 6. 상담 관련 인덱스
-- ========================================================

-- 상담 조회 개선
CREATE INDEX IF NOT EXISTS idx_consultations_student
    ON consultations(student_id);
CREATE INDEX IF NOT EXISTS idx_consultations_teacher
    ON consultations(teacher_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date
    ON consultations(consultation_date);
CREATE INDEX IF NOT EXISTS idx_consultations_academy_date
    ON consultations(academy_id, consultation_date DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status
    ON consultations(status);

-- ========================================================
-- 7. 알림/메시지 관련 인덱스
-- ========================================================

-- 공지사항 조회 개선
CREATE INDEX IF NOT EXISTS idx_announcements_academy_date
    ON announcements(academy_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority
    ON announcements(priority, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned
    ON announcements(is_pinned DESC, published_at DESC);

-- 메시지 조회 개선
CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender
    ON messages(sender_id);

-- 알림 조회 개선
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_academy_type
    ON notifications(academy_id, type);

-- ========================================================
-- 8. 복합 인덱스 (자주 함께 사용되는 조건)
-- ========================================================

-- 대시보드 통계용 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_students_academy_status_date
    ON students(academy_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_academy_status_date
    ON payment_records(academy_id, payment_date, status);

CREATE INDEX IF NOT EXISTS idx_attendance_academy_status_date
    ON attendance_records(academy_id, status, attendance_date);

-- ========================================================
-- 9. 인덱스 통계 업데이트
-- ========================================================

-- 각 테이블의 인덱스 통계 업데이트
ANALYZE TABLE students;
ANALYZE TABLE student_events;
ANALYZE TABLE attendance_records;
ANALYZE TABLE student_charges;
ANALYZE TABLE payment_records;
ANALYZE TABLE classes;
ANALYZE TABLE enrollments;
ANALYZE TABLE class_schedules;
ANALYZE TABLE exams;
ANALYZE TABLE student_scores;
ANALYZE TABLE consultations;
ANALYZE TABLE announcements;
ANALYZE TABLE messages;
ANALYZE TABLE notifications;

-- ========================================================
-- 10. 인덱스 생성 결과 확인
-- ========================================================

-- 생성된 인덱스 목록 조회
SELECT
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    SEQ_IN_INDEX,
    CARDINALITY
FROM
    information_schema.STATISTICS
WHERE
    TABLE_SCHEMA = 'clabbit'
    AND INDEX_NAME NOT IN ('PRIMARY', 'academy_id')
ORDER BY
    TABLE_NAME,
    INDEX_NAME,
    SEQ_IN_INDEX;

-- ========================================================
-- 실행 완료 메시지
-- ========================================================
SELECT '✅ 성능 개선 인덱스 추가 완료' AS message;
SELECT CONCAT('총 ', COUNT(DISTINCT INDEX_NAME), '개 인덱스 생성/확인') AS result
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'clabbit'
AND INDEX_NAME NOT IN ('PRIMARY');