-- enrollments 테이블에 원비 수정 사유 컬럼 추가
ALTER TABLE enrollments
ADD COLUMN fee_adjustment_reason VARCHAR(500) NULL COMMENT '원비 수정 사유' AFTER first_month_fee;
