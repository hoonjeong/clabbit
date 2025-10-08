-- 수업 테이블에 결제방식 관련 필드 추가
-- 추가 필드:
-- 1. schedule_day: 요일
-- 2. schedule_hour: 시간 (시)
-- 3. schedule_minute: 분
-- 4. payment_cycle: 결제 주기 (monthly/weekly)
-- 5. payment_week_interval: 주 단위 간격 (weekly인 경우)

USE clabbit;

-- schedule_day 컬럼 추가 (기존 schedule과 별도로 유지)
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS schedule_day VARCHAR(20) COMMENT '수업 요일 (월/화/수/목/금/토/일)' AFTER schedule;

-- schedule_hour 컬럼 추가
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS schedule_hour INT COMMENT '수업 시간 (9-22)' AFTER schedule_day;

-- schedule_minute 컬럼 추가
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS schedule_minute INT COMMENT '수업 분 (0,5,10...55)' AFTER schedule_hour;

-- payment_cycle 컬럼 추가
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS payment_cycle ENUM('monthly', 'weekly') DEFAULT 'monthly' COMMENT '결제 주기' AFTER description;

-- payment_week_interval 컬럼 추가
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS payment_week_interval INT DEFAULT NULL COMMENT '주 단위 결제 간격 (weekly인 경우)' AFTER payment_cycle;

-- 인덱스 추가 (성능 최적화)
ALTER TABLE classes
ADD INDEX IF NOT EXISTS idx_payment_cycle (payment_cycle);

-- 제약조건 추가: weekly인 경우 payment_week_interval은 1 이상이어야 함
-- MySQL 8.0.16+ 에서만 CHECK 제약조건 지원
-- ALTER TABLE classes
-- ADD CONSTRAINT chk_payment_week_interval
-- CHECK (payment_cycle = 'monthly' OR (payment_cycle = 'weekly' AND payment_week_interval >= 1));
