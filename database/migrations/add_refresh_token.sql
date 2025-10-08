-- refresh_token 컬럼 추가 및 인덱스 생성
-- 자동로그인 기능을 위한 데이터베이스 스키마 업데이트

USE clabbit;

-- users 테이블에 refresh_token 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(500) NULL COMMENT 'Refresh Token (자동로그인용)';

-- refresh_token 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_refresh_token ON users(refresh_token);

-- 토큰 만료 시간 추가 (선택사항)
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMP NULL COMMENT 'Refresh Token 만료 시간';

-- 마지막 로그인 시간 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL COMMENT '마지막 로그인 시간';

-- 업데이트 완료 확인
SELECT
    'refresh_token 컬럼 추가 완료' AS status,
    COUNT(*) AS total_users
FROM users;
