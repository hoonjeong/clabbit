-- enrollment_type 컬럼 제거
-- 재원 여부는 student_events 테이블의 rejoin 이벤트로 구분

ALTER TABLE students
DROP COLUMN IF EXISTS enrollment_type;

-- 확인 쿼리
-- DESCRIBE students;