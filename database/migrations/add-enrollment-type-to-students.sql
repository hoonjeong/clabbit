-- 학생 테이블에 enrollment_type 컬럼 추가
-- 신규와 재원 학생 구분을 위한 컬럼

USE clabbit;

-- enrollment_type 컬럼 추가
ALTER TABLE students
ADD COLUMN enrollment_type ENUM('new', 'returning') DEFAULT 'new'
COMMENT '등록 유형 (new: 신규, returning: 재원)'
AFTER enrollment_date;

-- 인덱스 추가 (검색 성능 향상)
ALTER TABLE students
ADD INDEX idx_enrollment_type (enrollment_type);

-- 기존 데이터를 모두 'new'로 설정 (이미 DEFAULT로 설정되어 있음)
-- UPDATE students SET enrollment_type = 'new' WHERE enrollment_type IS NULL;