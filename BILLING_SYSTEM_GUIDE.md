# 클래빗 수납/청구 시스템 가이드

## 목차
1. [시스템 개요](#시스템-개요)
2. [주요 기능](#주요-기능)
3. [데이터베이스 설정](#데이터베이스-설정)
4. [API 엔드포인트](#api-엔드포인트)
5. [사용 가이드](#사용-가이드)
6. [환경 설정](#환경-설정)

## 시스템 개요

클래빗 수납/청구 시스템은 학원의 수업료 청구, 수납, 환불 등 모든 재무 관련 업무를 통합 관리하는 모듈입니다.

### 핵심 특징
- 🏢 **멀티테넌시**: 학원별 완전한 데이터 격리
- 🔄 **자동화**: 정기 청구, 자동이체, 알림 발송 자동화
- 📊 **실시간 통계**: 대시보드를 통한 실시간 수납 현황 파악
- 📄 **문서 생성**: 영수증, 청구서 PDF 자동 생성
- 📂 **Excel 연동**: 대량 데이터 가져오기/내보내기 지원

## 주요 기능

### Phase 1: 기본 청구/수납 관리
- ✅ 청구 항목 관리 (수업료, 교재비 등)
- ✅ 학생별 청구 생성 및 관리
- ✅ 수납 처리 (현금, 카드, 계좌이체)
- ✅ 미납자 관리 및 연체 추적

### Phase 2: 자동화 및 알림
- ✅ 정기 청구 자동 생성 (스케줄러)
- ✅ SMS/이메일/카카오톡 알림
- ✅ 청구서 템플릿 관리
- ✅ 자동 연체 알림

### Phase 3: 고급 기능
- ✅ 할인 정책 적용 (형제, 조기납부 등)
- ✅ 고급 통계 및 리포트
- ✅ 재무 차트 및 분석
- ✅ Excel 내보내기/가져오기

### Phase 4: 환불 및 자동이체
- ✅ 환불 처리 시스템
- ✅ 자동이체 관리
- ✅ 영수증/청구서 PDF 생성
- ✅ 계좌 정보 암호화 저장

## 데이터베이스 설정

### 1. 테이블 생성
```bash
# MySQL에서 직접 실행하거나 스크립트 실행
mysql -u your_user -p clabbit < database/migrations/create-billing-tables.sql
```

### 2. 주요 테이블 구조

#### billing_items (청구 항목)
- 수업료, 교재비 등 청구 항목 정의
- 기본 금액 및 활성화 상태 관리

#### student_charges (학생 청구)
- 학생별 개별 청구 내역
- 청구 상태: pending, partial, paid, overdue, cancelled

#### payment_records (수납 기록)
- 실제 수납 내역 및 영수증 번호
- 수납 방법: cash, card, transfer, auto_transfer

#### auto_payment_info (자동이체)
- 암호화된 계좌 정보 저장
- 출금일 및 금액 관리

## API 엔드포인트

### 청구 관리
```javascript
// 청구 목록 조회
GET /api/charges?month=2025-01&status=pending

// 청구 생성
POST /api/charges
Body: {
  student_id: 1,
  billing_item_id: 1,
  amount: 300000,
  charge_date: "2025-01-01",
  due_date: "2025-01-10"
}

// 일괄 청구 생성
POST /api/charges/bulk
Body: {
  student_ids: [1, 2, 3],
  billing_item_id: 1,
  amount: 300000,
  charge_month: "2025-01"
}

// 청구 수정
PUT /api/charges/:id
Body: {
  amount: 280000,
  discount_amount: 20000,
  discount_reason: "형제 할인"
}

// 청구 취소
DELETE /api/charges/:id
```

### 수납 처리
```javascript
// 수납 등록
POST /api/payments
Body: {
  student_id: 1,
  charge_id: 1,
  amount: 300000,
  payment_method: "card",
  card_number_masked: "****-****-****-1234"
}

// 수납 목록 조회
GET /api/payments?from_date=2025-01-01&to_date=2025-01-31

// 영수증 발행
GET /api/receipts/:payment_id/pdf

// 수납 취소
PUT /api/payments/:id/cancel
```

### 환불 처리
```javascript
// 환불 신청
POST /api/refunds
Body: {
  payment_id: 1,
  student_id: 1,
  amount: 300000,
  reason: "학원 그만둠",
  refund_method: "transfer",
  bank_name: "국민은행",
  account_number: "123-456-789",
  account_holder: "홍길동"
}

// 환불 승인
PUT /api/refunds/:id/approve

// 환불 거절
PUT /api/refunds/:id/reject
Body: { reason: "환불 기간 초과" }
```

### 자동이체
```javascript
// 자동이체 등록
POST /api/auto-payments
Body: {
  student_id: 1,
  bank_name: "신한은행",
  account_number: "110-123-456789",
  account_holder: "김학부모",
  withdrawal_day: 10,
  monthly_amount: 300000
}

// 자동이체 목록
GET /api/auto-payments

// 자동이체 해지
PUT /api/auto-payments/:id/terminate
```

### 통계 및 리포트
```javascript
// 대시보드 통계
GET /api/billing/dashboard-stats

// 미납자 목록
GET /api/billing/unpaid-students

// 월별 수납 통계
GET /api/billing/statistics/monthly?month=2025-01

// 수납 방법별 통계
GET /api/billing/statistics/payment-methods?month=2025-01
```

### Excel 내보내기/가져오기
```javascript
// 청구 데이터 내보내기
GET /api/billing/export/charges?month=2025-01

// 수납 데이터 내보내기
GET /api/billing/export/payments?month=2025-01

// 미납자 목록 내보내기
GET /api/billing/export/unpaid

// 청구 데이터 가져오기
POST /api/billing/import/charges
Content-Type: multipart/form-data
Body: Excel file
```

## 사용 가이드

### 1. 월초 정기 청구 생성
1. **수납/청구 > 청구 관리** 메뉴 접속
2. **일괄 청구 생성** 버튼 클릭
3. 청구 월, 항목, 대상 학생 선택
4. 할인 정책 자동 적용 확인
5. 청구 생성 및 알림 발송

### 2. 수납 처리
1. **수납/청구 > 수납 등록** 메뉴 접속
2. 학생 검색 및 미납 청구 확인
3. 수납 방법 선택 및 금액 입력
4. 영수증 자동 발행 (이메일/인쇄)

### 3. 미납자 관리
1. **수납/청구 > 미납 학생** 메뉴에서 미납자 확인
2. 필터: 연체일수, 미납 금액별 정렬
3. 일괄 알림 발송 (SMS/카카오톡)
4. Excel 다운로드로 관리

### 4. 자동이체 설정
1. **학생 상세** 페이지에서 자동이체 등록
2. 동의서 업로드 및 계좌 정보 입력
3. 매월 지정일 자동 출금 처리
4. 출금 실패 시 자동 알림

### 5. 환불 처리
1. **수납 내역**에서 환불 대상 선택
2. 환불 사유 및 계좌 정보 입력
3. 관리자 승인 후 처리
4. 환불 영수증 발행

## 환경 설정

### 필수 환경 변수 (.env)
```bash
# 데이터 암호화 키 (32자 이상)
ENCRYPTION_KEY=your-very-secure-encryption-key-32chars

# 이메일 설정 (알림 발송)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_NAME=클래빗 알림
MAIL_FROM_EMAIL=noreply@clabbit.com

# SMS 설정 (선택사항)
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret
SMS_SENDER_NUMBER=02-1234-5678

# 카카오 알림톡 (선택사항)
KAKAO_API_KEY=your-kakao-api-key
KAKAO_SENDER_KEY=your-sender-key
KAKAO_TEMPLATE_CODE=billing_notice

# 스케줄러 설정
ENABLE_SCHEDULER=true
SCHEDULER_TIME_ZONE=Asia/Seoul
DAILY_CHARGE_TIME=09:00
WEEKLY_REMINDER_DAY=5  # 금요일
MONTHLY_CHARGE_DAY=1    # 매월 1일
```

### 스케줄러 작업
- **매일 09:00**: 정기 청구 생성 확인
- **매주 금요일 10:00**: 미납 알림 발송
- **매월 1일 09:00**: 월별 청구 생성
- **매월 말일 18:00**: 월말 정산 리포트

## 주의사항

### 보안
- ⚠️ 계좌번호는 AES-256 암호화 저장
- ⚠️ ENCRYPTION_KEY는 절대 노출 금지
- ⚠️ PDF 생성 시 개인정보 마스킹 처리

### 성능
- 대량 청구 생성 시 배치 처리 (100건씩)
- Excel 가져오기는 최대 10,000건 제한
- PDF 생성은 동시 최대 10개 제한

### 데이터 정합성
- 환불 시 트랜잭션 처리로 일관성 보장
- 자동이체 실패 시 3회 재시도
- 중복 수납 방지 로직 적용

## 문제 해결

### 스케줄러가 작동하지 않음
```bash
# 스케줄러 상태 확인
npm run check-scheduler

# 수동 실행
node scripts/run-scheduler.js
```

### PDF 생성 실패
```bash
# Puppeteer 재설치
npm rebuild puppeteer

# 한글 폰트 설치 (Linux)
sudo apt-get install fonts-nanum
```

### 이메일 발송 실패
1. Gmail 2단계 인증 활성화
2. 앱 비밀번호 생성
3. .env의 MAIL_PASSWORD를 앱 비밀번호로 설정

## 업데이트 내역

### v1.0.0 (2025-01-07)
- ✅ 청구/수납 기본 기능 구현
- ✅ 자동화 스케줄러 추가
- ✅ 할인 정책 시스템
- ✅ 환불 및 자동이체 관리
- ✅ PDF 영수증 생성
- ✅ Excel 가져오기/내보내기

## 지원

문제 발생 시 다음을 확인해주세요:
1. 로그 파일: `logs/billing-*.log`
2. 데이터베이스 연결 상태
3. 환경 변수 설정
4. 필수 npm 패키지 설치 여부

추가 지원이 필요하신 경우 시스템 관리자에게 문의하세요.