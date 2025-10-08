-- =====================================================
-- 성능 향상을 위한 인덱스 추가
-- 실행 방법: MySQL에서 직접 실행 또는
--           node scripts/add-performance-indexes.js
-- =====================================================

USE clabbit;

-- =====================================================
-- 1. STUDENTS 테이블 인덱스
-- =====================================================

-- 이름으로 검색 (학생 검색 기능)
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);

-- 전화번호로 검색 (학생/부모 연락처 검색)
CREATE INDEX IF NOT EXISTS idx_students_phone ON students(student_phone, parent_phone);

-- 상태 + 날짜로 필터링 (재원생 관리)
CREATE INDEX IF NOT EXISTS idx_students_status_date ON students(status, enrollment_date);

-- 학원별 재원 상태 조회 (멀티테넌시 + 상태 필터)
CREATE INDEX IF NOT EXISTS idx_students_academy_status ON students(academy_id, status);

-- 등록 구분 조회 (신규/재원 구분)
CREATE INDEX IF NOT EXISTS idx_students_enrollment_type ON students(enrollment_type);

-- 학교별 조회
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);

-- =====================================================
-- 2. STUDENT_EVENTS 테이블 인덱스
-- =====================================================

-- 학원별 이벤트 타입 + 날짜 통계 (대시보드 통계)
CREATE INDEX IF NOT EXISTS idx_student_events_academy_type_date
ON student_events(academy_id, event_type, event_date);

-- 학생별 이벤트 조회
CREATE INDEX IF NOT EXISTS idx_student_events_student_type
ON student_events(student_id, event_type);

-- =====================================================
-- 3. CLASSES 테이블 인덱스
-- =====================================================

-- 학원별 강사 조회
CREATE INDEX IF NOT EXISTS idx_classes_academy_teacher
ON classes(academy_id, teacher_id);

-- 요일 + 시간별 조회 (시간표 관리)
CREATE INDEX IF NOT EXISTS idx_classes_day_time
ON classes(day_of_week, class_time);

-- 수업명 검색
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(class_name);

-- =====================================================
-- 4. ENROLLMENTS 테이블 인덱스
-- =====================================================

-- 학원별 학생 수강 내역
CREATE INDEX IF NOT EXISTS idx_enrollments_academy_student
ON enrollments(academy_id, student_id);

-- 수업별 수강생 조회
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(class_id);

-- 수강 상태별 조회
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);

-- 시작일 기준 조회
CREATE INDEX IF NOT EXISTS idx_enrollments_start_date ON enrollments(start_date);

-- =====================================================
-- 5. ATTENDANCE 테이블 인덱스
-- =====================================================

-- 날짜별 출석 조회
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- 학생별 출석 이력
CREATE INDEX IF NOT EXISTS idx_attendance_student_date
ON attendance(student_id, attendance_date);

-- 수업별 출석 조회
CREATE INDEX IF NOT EXISTS idx_attendance_class_date
ON attendance(class_id, attendance_date);

-- 학원별 출석 통계
CREATE INDEX IF NOT EXISTS idx_attendance_academy_date
ON attendance(academy_id, attendance_date);

-- 출석 상태별 조회
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- =====================================================
-- 6. BILLINGS 테이블 인덱스
-- =====================================================

-- 학생별 청구 내역
CREATE INDEX IF NOT EXISTS idx_billings_student ON billings(student_id);

-- 상태 + 날짜별 조회 (미납 관리)
CREATE INDEX IF NOT EXISTS idx_billings_status_date
ON billings(status, billing_date);

-- 학원별 월별 청구
CREATE INDEX IF NOT EXISTS idx_billings_academy_month
ON billings(academy_id, billing_month);

-- =====================================================
-- 7. PAYMENTS 테이블 인덱스
-- =====================================================

-- 청구서별 결제 내역
CREATE INDEX IF NOT EXISTS idx_payments_billing ON payments(billing_id);

-- 날짜별 결제 조회
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);

-- 결제 방법별 조회
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);

-- 학원별 결제 내역
CREATE INDEX IF NOT EXISTS idx_payments_academy ON payments(academy_id);

-- =====================================================
-- 8. TEACHERS 테이블 인덱스
-- =====================================================

-- 이름으로 검색
CREATE INDEX IF NOT EXISTS idx_teachers_name ON teachers(name);

-- 과목별 조회
CREATE INDEX IF NOT EXISTS idx_teachers_subject ON teachers(subject);

-- 학원별 상태 조회
CREATE INDEX IF NOT EXISTS idx_teachers_academy_status
ON teachers(academy_id, employment_status);

-- =====================================================
-- 9. USER_ACADEMY_ROLES 테이블 인덱스
-- =====================================================

-- 사용자별 학원 조회
CREATE INDEX IF NOT EXISTS idx_user_academy_roles_user
ON user_academy_roles(user_id);

-- 학원별 사용자 조회
CREATE INDEX IF NOT EXISTS idx_user_academy_roles_academy
ON user_academy_roles(academy_id);

-- =====================================================
-- 10. 인덱스 통계 업데이트
-- =====================================================

-- 모든 테이블의 통계 정보 업데이트
ANALYZE TABLE students;
ANALYZE TABLE student_events;
ANALYZE TABLE classes;
ANALYZE TABLE enrollments;
ANALYZE TABLE attendance;
ANALYZE TABLE billings;
ANALYZE TABLE payments;
ANALYZE TABLE teachers;
ANALYZE TABLE user_academy_roles;

-- =====================================================
-- 완료 메시지
-- =====================================================
SELECT '✅ 모든 인덱스가 성공적으로 추가되었습니다.' AS Result;