-- 청구 및 수납 관리 시스템 테이블 생성
-- Phase 1: 핵심 테이블 구조

USE clabbit;

-- 1. 청구 항목 정의 테이블 (학원별 청구 항목 관리)
CREATE TABLE IF NOT EXISTS billing_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '항목명 (예: 수업료, 교재비)',
    category ENUM('tuition', 'material', 'test', 'event', 'other') DEFAULT 'tuition' COMMENT '항목 분류',
    default_amount DECIMAL(10,0) DEFAULT 0 COMMENT '기본 금액',
    description TEXT COMMENT '항목 설명',
    is_recurring BOOLEAN DEFAULT FALSE COMMENT '정기 청구 여부',
    recurring_day INT COMMENT '정기 청구일 (1-31)',
    is_active BOOLEAN DEFAULT TRUE COMMENT '사용 여부',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_academy_category (academy_id, category),
    INDEX idx_academy_active (academy_id, is_active),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 청구서 테이블 (월별/기간별 청구 관리)
CREATE TABLE IF NOT EXISTS billing_invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    invoice_number VARCHAR(50) NOT NULL COMMENT '청구서 번호',
    billing_month VARCHAR(7) NOT NULL COMMENT 'YYYY-MM 형식',
    title VARCHAR(200) NOT NULL COMMENT '청구서 제목',
    total_amount DECIMAL(10,0) DEFAULT 0 COMMENT '총 청구 금액',
    due_date DATE COMMENT '납부 기한',
    status ENUM('draft', 'sent', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
    notes TEXT COMMENT '청구서 메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT COMMENT '생성자 user_id',

    UNIQUE KEY unique_invoice (academy_id, invoice_number),
    INDEX idx_academy_month (academy_id, billing_month),
    INDEX idx_academy_status (academy_id, status),
    INDEX idx_due_date (due_date),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 학생별 청구 테이블 (개별 학생 청구 내역)
CREATE TABLE IF NOT EXISTS student_charges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    invoice_id INT COMMENT '연결된 청구서 ID',
    billing_item_id INT COMMENT '청구 항목 ID',
    charge_date DATE NOT NULL COMMENT '청구일',
    amount DECIMAL(10,0) NOT NULL COMMENT '청구 금액',
    discount_amount DECIMAL(10,0) DEFAULT 0 COMMENT '할인 금액',
    discount_reason VARCHAR(200) COMMENT '할인 사유',
    final_amount DECIMAL(10,0) NOT NULL COMMENT '최종 청구 금액',
    paid_amount DECIMAL(10,0) DEFAULT 0 COMMENT '수납 금액',
    remaining_amount DECIMAL(10,0) GENERATED ALWAYS AS (final_amount - paid_amount) STORED,
    status ENUM('pending', 'partial', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    due_date DATE COMMENT '납부 기한',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_academy_student (academy_id, student_id),
    INDEX idx_academy_date (academy_id, charge_date),
    INDEX idx_academy_status (academy_id, status),
    INDEX idx_invoice (invoice_id),
    INDEX idx_due_date (due_date),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (invoice_id) REFERENCES billing_invoices(id) ON DELETE SET NULL,
    FOREIGN KEY (billing_item_id) REFERENCES billing_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 수납 내역 테이블 (실제 납부 기록)
CREATE TABLE IF NOT EXISTS payment_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    charge_id INT COMMENT '연결된 청구 ID',
    payment_date DATETIME NOT NULL COMMENT '수납 일시',
    amount DECIMAL(10,0) NOT NULL COMMENT '수납 금액',
    payment_method ENUM('cash', 'card', 'transfer', 'auto_transfer', 'other') DEFAULT 'cash',
    receipt_number VARCHAR(50) COMMENT '영수증 번호',
    card_number_masked VARCHAR(20) COMMENT '카드 번호 마스킹',
    bank_name VARCHAR(50) COMMENT '은행명',
    depositor_name VARCHAR(50) COMMENT '입금자명',
    status ENUM('completed', 'pending', 'cancelled', 'refunded') DEFAULT 'completed',
    notes TEXT COMMENT '메모',
    processed_by INT COMMENT '처리자 user_id',
    cancelled_at DATETIME COMMENT '취소 일시',
    cancelled_by INT COMMENT '취소자 user_id',
    cancelled_reason TEXT COMMENT '취소 사유',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_academy_student (academy_id, student_id),
    INDEX idx_academy_date (academy_id, payment_date),
    INDEX idx_charge (charge_id),
    INDEX idx_receipt (receipt_number),
    INDEX idx_status (status),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (charge_id) REFERENCES student_charges(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 할인 정책 테이블
CREATE TABLE IF NOT EXISTS discount_policies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '할인 정책명',
    type ENUM('percentage', 'fixed') DEFAULT 'fixed' COMMENT '할인 유형',
    value DECIMAL(10,2) NOT NULL COMMENT '할인 값 (율 또는 금액)',
    conditions JSON COMMENT '적용 조건 (예: 형제할인, 장기등록 등)',
    priority INT DEFAULT 0 COMMENT '우선순위 (높을수록 먼저 적용)',
    is_active BOOLEAN DEFAULT TRUE,
    valid_from DATE COMMENT '유효 시작일',
    valid_to DATE COMMENT '유효 종료일',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_academy_active (academy_id, is_active),
    INDEX idx_priority (priority),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 환불 내역 테이블
CREATE TABLE IF NOT EXISTS refund_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    payment_id INT NOT NULL COMMENT '원 수납 ID',
    refund_date DATETIME NOT NULL COMMENT '환불 일시',
    amount DECIMAL(10,0) NOT NULL COMMENT '환불 금액',
    refund_method ENUM('cash', 'card', 'transfer', 'other') DEFAULT 'cash',
    reason TEXT NOT NULL COMMENT '환불 사유',
    bank_name VARCHAR(50) COMMENT '환불 은행명',
    account_number VARCHAR(50) COMMENT '환불 계좌번호',
    account_holder VARCHAR(50) COMMENT '예금주',
    status ENUM('pending', 'completed', 'rejected') DEFAULT 'pending',
    processed_by INT COMMENT '처리자 user_id',
    approved_by INT COMMENT '승인자 user_id',
    approved_at DATETIME COMMENT '승인 일시',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_academy_student (academy_id, student_id),
    INDEX idx_academy_date (academy_id, refund_date),
    INDEX idx_payment (payment_id),
    INDEX idx_status (status),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payment_records(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 청구 템플릿 테이블 (반복 청구용)
CREATE TABLE IF NOT EXISTS billing_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    name VARCHAR(100) NOT NULL COMMENT '템플릿명',
    description TEXT COMMENT '설명',
    items JSON NOT NULL COMMENT '청구 항목 리스트',
    total_amount DECIMAL(10,0) DEFAULT 0 COMMENT '총 금액',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_academy_active (academy_id, is_active),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 자동이체 정보 테이블
CREATE TABLE IF NOT EXISTS auto_payment_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    bank_name VARCHAR(50) NOT NULL COMMENT '은행명',
    account_number_encrypted VARCHAR(255) COMMENT '암호화된 계좌번호',
    account_holder VARCHAR(50) NOT NULL COMMENT '예금주',
    withdrawal_day INT NOT NULL COMMENT '출금일 (1-31)',
    monthly_amount DECIMAL(10,0) NOT NULL COMMENT '월 출금액',
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE NOT NULL COMMENT '시작일',
    end_date DATE COMMENT '종료일',
    last_payment_date DATE COMMENT '마지막 출금일',
    consent_file_path VARCHAR(500) COMMENT '동의서 파일 경로',
    notes TEXT COMMENT '메모',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_student_payment (academy_id, student_id, is_active),
    INDEX idx_academy_active (academy_id, is_active),
    INDEX idx_withdrawal_day (withdrawal_day),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 청구/수납 알림 로그 테이블
CREATE TABLE IF NOT EXISTS billing_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academy_id INT NOT NULL,
    student_id INT NOT NULL,
    type ENUM('charge_created', 'payment_reminder', 'payment_received', 'overdue_notice') NOT NULL,
    channel ENUM('sms', 'kakao', 'email', 'app_push') NOT NULL,
    recipient VARCHAR(100) NOT NULL COMMENT '수신자 연락처',
    title VARCHAR(200) COMMENT '알림 제목',
    message TEXT NOT NULL COMMENT '알림 내용',
    status ENUM('pending', 'sent', 'failed', 'cancelled') DEFAULT 'pending',
    sent_at DATETIME COMMENT '발송 일시',
    failed_reason TEXT COMMENT '실패 사유',
    reference_id INT COMMENT '관련 청구/수납 ID',
    reference_type ENUM('charge', 'payment', 'invoice') COMMENT '참조 유형',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_academy_student (academy_id, student_id),
    INDEX idx_academy_type (academy_id, type),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at),
    FOREIGN KEY (academy_id) REFERENCES academies(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 트리거: 청구 생성 시 청구서 총액 업데이트
DELIMITER //
CREATE TRIGGER update_invoice_total_on_charge_insert
AFTER INSERT ON student_charges
FOR EACH ROW
BEGIN
    IF NEW.invoice_id IS NOT NULL THEN
        UPDATE billing_invoices
        SET total_amount = (
            SELECT SUM(final_amount)
            FROM student_charges
            WHERE invoice_id = NEW.invoice_id
            AND status != 'cancelled'
        )
        WHERE id = NEW.invoice_id;
    END IF;
END//

-- 트리거: 청구 수정 시 청구서 총액 업데이트
CREATE TRIGGER update_invoice_total_on_charge_update
AFTER UPDATE ON student_charges
FOR EACH ROW
BEGIN
    IF NEW.invoice_id IS NOT NULL OR OLD.invoice_id IS NOT NULL THEN
        -- 새 청구서 업데이트
        IF NEW.invoice_id IS NOT NULL THEN
            UPDATE billing_invoices
            SET total_amount = (
                SELECT COALESCE(SUM(final_amount), 0)
                FROM student_charges
                WHERE invoice_id = NEW.invoice_id
                AND status != 'cancelled'
            )
            WHERE id = NEW.invoice_id;
        END IF;

        -- 기존 청구서 업데이트 (청구서가 변경된 경우)
        IF OLD.invoice_id IS NOT NULL AND OLD.invoice_id != COALESCE(NEW.invoice_id, 0) THEN
            UPDATE billing_invoices
            SET total_amount = (
                SELECT COALESCE(SUM(final_amount), 0)
                FROM student_charges
                WHERE invoice_id = OLD.invoice_id
                AND status != 'cancelled'
            )
            WHERE id = OLD.invoice_id;
        END IF;
    END IF;
END//

-- 트리거: 수납 등록 시 청구 상태 및 수납액 업데이트
CREATE TRIGGER update_charge_on_payment_insert
AFTER INSERT ON payment_records
FOR EACH ROW
BEGIN
    IF NEW.charge_id IS NOT NULL AND NEW.status = 'completed' THEN
        -- 청구 테이블의 수납 금액 업데이트
        UPDATE student_charges
        SET paid_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payment_records
            WHERE charge_id = NEW.charge_id
            AND status = 'completed'
        ),
        status = CASE
            WHEN paid_amount >= final_amount THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            ELSE status
        END
        WHERE id = NEW.charge_id;

        -- 청구서 상태 업데이트
        UPDATE billing_invoices bi
        SET status = (
            SELECT CASE
                WHEN SUM(CASE WHEN sc.status = 'paid' THEN 1 ELSE 0 END) = COUNT(*) THEN 'paid'
                WHEN SUM(CASE WHEN sc.status IN ('paid', 'partial') THEN 1 ELSE 0 END) > 0 THEN 'partial'
                WHEN MAX(sc.due_date) < CURDATE() THEN 'overdue'
                ELSE 'sent'
            END
            FROM student_charges sc
            WHERE sc.invoice_id = bi.id
            AND sc.status != 'cancelled'
        )
        WHERE bi.id = (
            SELECT invoice_id
            FROM student_charges
            WHERE id = NEW.charge_id
        );
    END IF;
END//

-- 트리거: 수납 취소 시 청구 상태 업데이트
CREATE TRIGGER update_charge_on_payment_cancel
AFTER UPDATE ON payment_records
FOR EACH ROW
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status = 'completed' AND NEW.charge_id IS NOT NULL THEN
        -- 청구 테이블의 수납 금액 재계산
        UPDATE student_charges
        SET paid_amount = (
            SELECT COALESCE(SUM(amount), 0)
            FROM payment_records
            WHERE charge_id = NEW.charge_id
            AND status = 'completed'
        ),
        status = CASE
            WHEN paid_amount >= final_amount THEN 'paid'
            WHEN paid_amount > 0 THEN 'partial'
            WHEN due_date < CURDATE() THEN 'overdue'
            ELSE 'pending'
        END
        WHERE id = NEW.charge_id;
    END IF;
END//

DELIMITER ;

-- 샘플 데이터: 기본 청구 항목
INSERT INTO billing_items (academy_id, name, category, default_amount, is_recurring, recurring_day)
SELECT
    a.id,
    '월 수업료',
    'tuition',
    200000,
    TRUE,
    25
FROM academies a
WHERE NOT EXISTS (
    SELECT 1 FROM billing_items bi
    WHERE bi.academy_id = a.id
    AND bi.name = '월 수업료'
);

INSERT INTO billing_items (academy_id, name, category, default_amount, is_recurring)
SELECT
    a.id,
    '교재비',
    'material',
    30000,
    FALSE
FROM academies a
WHERE NOT EXISTS (
    SELECT 1 FROM billing_items bi
    WHERE bi.academy_id = a.id
    AND bi.name = '교재비'
);

-- 뷰: 미납자 현황
CREATE OR REPLACE VIEW v_unpaid_summary AS
SELECT
    sc.academy_id,
    sc.student_id,
    s.name AS student_name,
    s.phone AS student_phone,
    s.parent_phone,
    COUNT(DISTINCT sc.id) AS unpaid_count,
    SUM(sc.remaining_amount) AS total_unpaid,
    MIN(sc.due_date) AS earliest_due_date,
    GROUP_CONCAT(
        CONCAT(DATE_FORMAT(sc.charge_date, '%Y-%m-%d'), ':', sc.final_amount)
        ORDER BY sc.charge_date
        SEPARATOR ', '
    ) AS charge_details
FROM student_charges sc
INNER JOIN students s ON sc.student_id = s.id
WHERE sc.status IN ('pending', 'partial', 'overdue')
AND sc.remaining_amount > 0
GROUP BY sc.academy_id, sc.student_id, s.name, s.phone, s.parent_phone;

-- 뷰: 월별 수납 현황
CREATE OR REPLACE VIEW v_monthly_payment_summary AS
SELECT
    pr.academy_id,
    DATE_FORMAT(pr.payment_date, '%Y-%m') AS payment_month,
    COUNT(DISTINCT pr.student_id) AS paid_students,
    COUNT(pr.id) AS payment_count,
    SUM(pr.amount) AS total_amount,
    SUM(CASE WHEN pr.payment_method = 'cash' THEN pr.amount ELSE 0 END) AS cash_amount,
    SUM(CASE WHEN pr.payment_method = 'card' THEN pr.amount ELSE 0 END) AS card_amount,
    SUM(CASE WHEN pr.payment_method = 'transfer' THEN pr.amount ELSE 0 END) AS transfer_amount,
    SUM(CASE WHEN pr.payment_method = 'auto_transfer' THEN pr.amount ELSE 0 END) AS auto_transfer_amount
FROM payment_records pr
WHERE pr.status = 'completed'
GROUP BY pr.academy_id, DATE_FORMAT(pr.payment_date, '%Y-%m');

DELIMITER ;