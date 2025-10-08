# 수업 추가 페이지 개편 완료 가이드

## 📋 변경 사항 요약

### 1. **학년 선택 필드 개편**
- **변경 전**: 초등/중등/고등/기타 (4개 선택지)
- **변경 후**: 초1~초6, 중1~중3, 고1~고3, 기타 (총 13개 선택지)
- **파일**: `views/classes/new.ejs`, `views/classes/detail.ejs`

### 2. **수업시간 선택 필드 개편**
- **변경 전**: 텍스트 입력 (예: "월수금 14:00-16:00")
- **변경 후**: 3개의 독립적인 드롭다운
  - 요일: 월/화/수/목/금/토/일
  - 시간: 09시 ~ 22시 (14개 옵션)
  - 분: 00~55분 (5분 단위, 12개 옵션)
- **데이터 저장**:
  - `schedule_day`: 요일 (VARCHAR)
  - `schedule_hour`: 시간 (INT)
  - `schedule_minute`: 분 (INT)
  - `schedule`: 자동 생성된 문자열 (기존 호환성 유지)
- **파일**: `views/classes/new.ejs`, `views/classes/detail.ejs`

### 3. **결제방식 필드 추가**
- **새로운 필드**:
  - 결제 주기: 월 단위 / 주 단위 (라디오 버튼)
  - 주 단위 간격: 주 단위 선택 시에만 표시되는 숫자 입력 필드
- **데이터 저장**:
  - `payment_cycle`: ENUM('monthly', 'weekly')
  - `payment_week_interval`: INT (주 단위인 경우만 값 저장)
- **유효성 검사**: 주 단위 선택 시 간격은 1 이상 필수
- **파일**: `views/classes/new.ejs`, `views/classes/detail.ejs`

---

## 🗄️ 데이터베이스 마이그레이션

### 1단계: 마이그레이션 스크립트 실행

**중요**: 프로덕션 환경에서는 반드시 데이터베이스 백업 후 실행하세요!

```bash
# MySQL 접속
mysql -u [사용자명] -p [데이터베이스명]

# 또는 .env 파일의 DB 정보 사용
mysql -u $DB_USER -p$DB_PASSWORD $DB_NAME
```

MySQL 접속 후, 마이그레이션 SQL 파일 실행:

```sql
source database/migrations/add-payment-fields-to-classes.sql;
```

또는 직접 실행:

```bash
mysql -u [사용자명] -p [데이터베이스명] < database/migrations/add-payment-fields-to-classes.sql
```

### 2단계: 마이그레이션 확인

```sql
-- 테이블 구조 확인
DESCRIBE classes;

-- 새로 추가된 컬럼 확인
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'clabbit'
  AND TABLE_NAME = 'classes'
  AND COLUMN_NAME IN ('schedule_day', 'schedule_hour', 'schedule_minute', 'payment_cycle', 'payment_week_interval');
```

예상 결과:
```
+-------------------------+-----------+-------------+----------------+
| COLUMN_NAME             | DATA_TYPE | IS_NULLABLE | COLUMN_DEFAULT |
+-------------------------+-----------+-------------+----------------+
| schedule_day            | varchar   | YES         | NULL           |
| schedule_hour           | int       | YES         | NULL           |
| schedule_minute         | int       | YES         | NULL           |
| payment_cycle           | enum      | YES         | monthly        |
| payment_week_interval   | int       | YES         | NULL           |
+-------------------------+-----------+-------------+----------------+
```

---

## 🚀 백엔드 변경사항

### 1. Model 수정 (`src/models/class.model.js`)
- `create()`: 새로운 필드 추가 (schedule_day, schedule_hour, schedule_minute, payment_cycle, payment_week_interval)
- `update()`: 새로운 필드 업데이트 로직 추가

### 2. Controller 수정 (`src/controllers/classes.controller.js`)
- `create()`: 결제 주기 검증 로직 추가
  - weekly 선택 시 payment_week_interval >= 1 검증
- `update()`: 동일한 검증 로직 추가

---

## 🎨 프론트엔드 변경사항

### 1. 수업 추가 페이지 (`views/classes/new.ejs`)
#### 추가된 기능:
- 학년 드롭다운 옵션 확장 (초1~고3)
- 수업시간 3개 드롭다운 (요일/시간/분)
- 결제 주기 라디오 버튼
- 주 단위 간격 입력 필드 (조건부 표시)

#### JavaScript 로직:
```javascript
// 결제 주기 변경 시 주 단위 간격 필드 표시/숨김
paymentCycleRadios.forEach(radio => {
    radio.addEventListener('change', function() {
        if (this.value === 'weekly') {
            weeklyIntervalContainer.style.display = 'block';
        } else {
            weeklyIntervalContainer.style.display = 'none';
        }
    });
});

// 폼 제출 시 데이터 처리
// - schedule 문자열 자동 생성: "월요일 14:30"
// - 숫자 필드 parseInt 변환
// - 결제 주기 검증
```

### 2. 수업 상세/수정 페이지 (`views/classes/detail.ejs`)
#### 추가된 기능:
- 동일한 UI 개편 적용
- 데이터 로드 시 개별 필드 값 설정
- 수정 모드에서 결제 주기 변경 가능
- 저장 시 동일한 유효성 검사

---

## ✅ 테스트 체크리스트

### 데이터베이스 테스트
- [ ] 마이그레이션 스크립트 정상 실행
- [ ] 새로운 컬럼 추가 확인
- [ ] 인덱스 추가 확인

### 수업 추가 기능 테스트
- [ ] 학년 드롭다운에서 초1~고3, 기타 선택 가능
- [ ] 수업시간 3개 드롭다운 정상 작동
- [ ] 결제 주기 "월 단위" 선택 → 주 단위 간격 필드 숨김
- [ ] 결제 주기 "주 단위" 선택 → 주 단위 간격 필드 표시
- [ ] 주 단위 선택 시 간격 미입력 → 유효성 검사 실패
- [ ] 주 단위 선택 시 간격 0 입력 → 유효성 검사 실패
- [ ] 주 단위 선택 시 간격 1 이상 입력 → 정상 저장
- [ ] 월 단위 선택 → payment_week_interval이 null로 저장
- [ ] 수업 등록 후 DB에 모든 필드 정상 저장 확인

### 수업 상세/수정 기능 테스트
- [ ] 기존 수업 데이터 정상 로드
- [ ] 새로운 필드 값 정상 표시
- [ ] 수정 모드 활성화 시 모든 필드 편집 가능
- [ ] 결제 주기 변경 시 조건부 필드 정상 작동
- [ ] 수정 저장 시 유효성 검사 정상 작동
- [ ] 수정 후 DB 업데이트 확인

### 기존 데이터 호환성 테스트
- [ ] 마이그레이션 전 생성된 수업 데이터 정상 표시
- [ ] 새 필드가 NULL인 기존 데이터 수정 가능
- [ ] 기존 schedule 필드와 새 필드 간 정합성 확인

---

## 🔧 문제 해결

### 마이그레이션 실패 시
```sql
-- 변경사항 롤백 (각 컬럼 개별 삭제)
ALTER TABLE classes DROP COLUMN IF EXISTS payment_week_interval;
ALTER TABLE classes DROP COLUMN IF EXISTS payment_cycle;
ALTER TABLE classes DROP COLUMN IF EXISTS schedule_minute;
ALTER TABLE classes DROP COLUMN IF EXISTS schedule_hour;
ALTER TABLE classes DROP COLUMN IF EXISTS schedule_day;
ALTER TABLE classes DROP INDEX IF EXISTS idx_payment_cycle;
```

### 기존 데이터 마이그레이션 (선택사항)
기존 `schedule` 텍스트 데이터를 새 필드로 변환하려면:

```sql
-- 예시: "월요일 14:30" 형식을 파싱하여 개별 필드로 저장
-- (실제 데이터 형식에 맞게 조정 필요)
UPDATE classes
SET
    schedule_day = SUBSTRING_INDEX(schedule, '요일', 1),
    schedule_hour = CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(schedule, ':', 1), ' ', -1) AS UNSIGNED),
    schedule_minute = CAST(SUBSTRING_INDEX(schedule, ':', -1) AS UNSIGNED)
WHERE schedule IS NOT NULL AND schedule != '';
```

---

## 📝 추가 고려사항

### 1. 향후 확장 가능성
- **다중 수업 시간 지원**: 현재는 하나의 시간만 저장 가능하지만, 향후 "월수금 14:00" 같은 다중 시간 지원 필요 시 `class_schedules` 별도 테이블 구성 고려
- **자동 원비 생성 연동**: `payment_cycle`과 `payment_week_interval` 데이터를 활용한 자동 원비 생성 로직 구현 예정

### 2. 데이터 무결성
- 현재 `schedule` 필드는 기존 호환성을 위해 유지되며, 자동으로 생성됨
- 새 필드(schedule_day/hour/minute)와 schedule 필드 간 정합성은 애플리케이션 레벨에서 보장

### 3. UI/UX 개선 제안
- 수업시간 입력 시 시작/종료 시간 모두 입력하도록 확장 가능
- 요일 다중 선택 기능 추가 고려 (월수금 수업 등)

---

## 📞 지원

문제 발생 시 다음 정보를 포함하여 리포트:
1. 브라우저 콘솔 에러 메시지
2. 네트워크 탭 API 응답
3. 서버 로그 (`console.error` 출력)
4. 데이터베이스 상태 (`DESCRIBE classes`)

---

**작업 완료일**: 2025-10-06
**작업자**: Claude Code
**버전**: v1.0
