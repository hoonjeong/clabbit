# 클래빗 성적 관리 및 상담 관리 시스템 가이드

## 📋 시스템 개요

클래빗 학원 관리 시스템에 **성적 관리**와 **상담 관리** 모듈이 추가되었습니다.

- **성적 관리**: 시험 점수 입력, 자동 분석, 성적표 생성, 학부모 공유
- **상담 관리**: 학생/학부모 상담 기록, 상담톡 메시징, 미상담자 관리

## 🚀 설치 및 설정

### 1. 데이터베이스 설정

```bash
# 데이터베이스 테이블 생성
node scripts/setup-performance-consultation.js
```

### 2. 서버 재시작

```bash
npm start
```

### 3. 접속 URL

- **성적 관리**: `http://localhost:3000/performance/exams`
- **상담 관리**: `http://localhost:3000/consultation/records`

## 📊 성적 관리 시스템

### 주요 기능

#### 1. 시험 관리
- 시험 정보 등록 (시험명, 유형, 날짜, 과목, 학년)
- 시험 문항 관리 (문항별 배점, 정답, 난이도, 영역)
- 시험별 통계 자동 생성

#### 2. 성적 입력
- **개별 입력**: 학생별로 하나씩 입력
- **일괄 입력**: Excel 파일로 여러 학생 동시 입력
- **OMR 입력**: OMR 카드 스캔 후 자동 입력 (추후 구현)

#### 3. 자동 분석
- **등급 계산**: 9등급제 자동 계산
- **석차 산정**: 학급별, 학년별 석차 자동 계산
- **영역별 분석**: 문법, 어휘, 독해 등 영역별 정답률
- **성적 추이**: 학생별 성적 변화 추이 그래프

#### 4. 성적표 생성
- 맞춤형 성적표 템플릿
- PDF 다운로드 및 인쇄
- 학부모 전송 (SMS/이메일/앱)

### API 엔드포인트

#### 시험 관리
```
POST   /api/performance/exams              # 시험 생성
GET    /api/performance/exams              # 시험 목록
GET    /api/performance/exams/:id          # 시험 상세
PUT    /api/performance/exams/:id          # 시험 수정
DELETE /api/performance/exams/:id          # 시험 삭제
```

#### 성적 관리
```
POST   /api/performance/scores             # 성적 입력
POST   /api/performance/scores/bulk        # 성적 일괄 입력
GET    /api/performance/scores             # 성적 목록
GET    /api/performance/scores/:id         # 성적 상세
PUT    /api/performance/scores/:id         # 성적 수정
DELETE /api/performance/scores/:id         # 성적 삭제
```

#### 분석 및 통계
```
GET    /api/performance/scores/:id/analysis        # 개별 성적 분석
GET    /api/performance/exams/:id/statistics       # 시험 통계
GET    /api/performance/students/:id/trend         # 학생 성적 추이
```

### 사용 방법

#### 시험 등록 및 성적 입력

1. **시험 등록**
   - `/performance/exams`에서 "시험 추가" 클릭
   - 시험 정보 입력 후 저장

2. **문항 등록** (선택사항)
   - 시험 목록에서 "문항 관리" 클릭
   - 각 문항의 배점, 정답, 난이도 입력

3. **성적 입력**
   - 시험 목록에서 "성적 입력" 클릭
   - 개별 또는 일괄 입력 방식 선택
   - 점수 입력 후 저장

4. **성적 분석**
   - `/performance/analysis`에서 시험 및 학생 선택
   - 자동 생성된 분석 결과 확인

## 💬 상담 관리 시스템

### 주요 기능

#### 1. 상담 기록 관리
- 상담 일자, 방법, 내용 기록
- 상담 분류별 관리 (신규, 정기, 성적, 진로 등)
- 중요 상담 표시 및 추가 상담 일정 관리

#### 2. 상담톡 (메시징)
- 학부모와 1:1 실시간 메시징
- 메시지 읽음 확인
- 파일/이미지 첨부 지원
- 대화 내용을 상담 기록으로 변환

#### 3. 미상담자 관리
- 30일 이상 미상담 학생 자동 추출
- 상담 필요 학생 우선순위 표시
- 일괄 상담 일정 등록

#### 4. 상담 통계
- 교사별 상담 건수
- 월별 상담 추이
- 상담 분류별 통계
- 추가 상담 필요 현황

### API 엔드포인트

#### 상담 기록
```
POST   /api/consultation/records           # 상담 생성
GET    /api/consultation/records           # 상담 목록
GET    /api/consultation/records/:id       # 상담 상세
PUT    /api/consultation/records/:id       # 상담 수정
DELETE /api/consultation/records/:id       # 상담 삭제
```

#### 상담톡
```
POST   /api/consultation/messages          # 메시지 전송
GET    /api/consultation/messages          # 메시지 목록
PUT    /api/consultation/messages/:id/read # 읽음 처리
GET    /api/consultation/conversations     # 대화 목록
```

#### 통계 및 분석
```
GET    /api/consultation/statistics        # 상담 통계
GET    /api/consultation/records/pending   # 미상담자 목록
GET    /api/consultation/dashboard         # 대시보드 데이터
```

### 사용 방법

#### 상담 기록 작성

1. **상담 추가**
   - `/consultation/records`에서 "상담 추가" 클릭
   - 학생 선택 및 상담 정보 입력
   - 중요 상담 여부, 추가 상담 필요 여부 체크

2. **상담 이력 조회**
   - 학생명, 날짜, 분류별 필터링
   - 중요 상담만 보기 옵션

3. **미상담자 확인**
   - 대시보드에서 미상담자 수 확인
   - 클릭하여 상세 목록 조회

#### 상담톡 사용

1. **대화 시작**
   - `/consultation/messages`에서 학생 선택
   - 메시지 입력 후 전송

2. **알림 확인**
   - 읽지 않은 메시지 배지로 표시
   - 실시간 알림 (웹소켓 구현 시)

## 🔧 고급 설정

### Excel 템플릿

#### 성적 일괄 입력 템플릿
```
| 학생번호 | 학생명 | 점수 |
|---------|--------|------|
| 2024001 | 홍길동 | 85   |
| 2024002 | 김영희 | 92   |
```

#### 시험 문항 템플릿
```
| 문항번호 | 정답 | 배점 | 난이도 | 영역 |
|---------|------|------|--------|------|
| 1       | 3    | 5    | 중     | 문법 |
| 2       | 2    | 5    | 하     | 어휘 |
```

### 권한 설정

- **관리자**: 모든 기능 사용 가능
- **교사**: 담당 학생만 조회/수정
- **학부모**: 자녀 정보만 조회
- **학생**: 본인 정보만 조회

### 알림 설정

```javascript
// 환경 변수 (.env)
ENABLE_SMS_NOTIFICATION=true
ENABLE_EMAIL_NOTIFICATION=true
ENABLE_APP_PUSH=true

// 알림 발송 시점
- 성적 입력 완료 시
- 상담 일정 등록 시
- 추가 상담 예정일 1일 전
```

## 📈 통계 및 리포트

### 성적 통계
- 시험별 평균, 최고점, 최저점
- 등급별 분포도
- 과목별 성취도 비교
- 학급/학년별 비교 분석

### 상담 통계
- 월별 상담 건수 추이
- 상담 유형별 비율
- 교사별 상담 실적
- 미상담 기간별 학생 수

## 🐛 문제 해결

### 일반적인 문제

#### 성적이 저장되지 않음
- 필수 필드 확인 (student_id, exam_id, raw_score)
- 점수 범위 확인 (0 ~ total_score)
- 중복 입력 확인 (학생-시험 조합 유일)

#### 상담 기록이 표시되지 않음
- 날짜 필터 확인
- 학원 ID 확인 (멀티테넌시)
- 상담 상태 확인 (completed/scheduled/cancelled)

#### 통계가 부정확함
- 캐시 초기화
- 데이터베이스 뷰 재생성
- 트리거 동작 확인

### 데이터베이스 관련

```sql
-- 성적 재계산
CALL recalculate_grades(exam_id);

-- 석차 재계산
CALL recalculate_ranks(exam_id);

-- 상담 통계 재생성
REFRESH MATERIALIZED VIEW consultation_statistics;
```

## 📞 지원

문제가 계속되는 경우:

1. 로그 확인: `logs/performance.log`, `logs/consultation.log`
2. 데이터베이스 상태 확인
3. 시스템 관리자 문의

## 🔄 업데이트 내역

### v1.0.0 (2025-01-07)
- ✅ 성적 관리 시스템 구현
- ✅ 상담 관리 시스템 구현
- ✅ 기본 통계 및 분석 기능
- ✅ Excel 가져오기/내보내기

### 예정된 기능
- [ ] OMR 카드 스캔 기능
- [ ] 실시간 알림 (WebSocket)
- [ ] AI 기반 성적 분석
- [ ] 상담 내용 자동 요약
- [ ] 모바일 앱 연동