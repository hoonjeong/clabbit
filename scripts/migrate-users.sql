-- users 테이블 마이그레이션 SQL

USE clabbit;

-- 1. name 컬럼이 없으면 추가 (owner_name이 있으면 이름 변경, 없으면 새로 추가)
ALTER TABLE users ADD COLUMN name VARCHAR(100) NOT NULL COMMENT '이름' AFTER password;

-- 2. owner_name 데이터를 name으로 복사 (컬럼이 있는 경우)
UPDATE users SET name = owner_name WHERE owner_name IS NOT NULL AND name IS NULL;

-- 3. 불필요한 컬럼 제거
ALTER TABLE users DROP COLUMN IF EXISTS academy_name;
ALTER TABLE users DROP COLUMN IF EXISTS owner_name;
ALTER TABLE users DROP COLUMN IF EXISTS agree_terms;
ALTER TABLE users DROP COLUMN IF EXISTS agree_marketing;

-- 4. password 컬럼 타입 변경 (bcrypt 지원)
ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NOT NULL COMMENT '비밀번호 (bcrypt)';

-- 5. phone 컬럼 NULL 허용
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) COMMENT '연락처';

-- 6. 최종 구조 확인
DESCRIBE users;

SELECT '✅ users 테이블 마이그레이션 완료!' as status;
