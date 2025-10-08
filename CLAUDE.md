# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**클래빗 (Clabbit)** - 학원 관리 시스템
- 한국 학원(Academy)을 위한 멀티테넌시 학생 관리 플랫폼
- 학원별 완전한 데이터 격리 (Multi-tenancy with strict data isolation)
- Node.js + Express + MySQL + EJS 기반

## 개발 환경 설정

### 필수 설정
```bash
# 1. 환경 변수 설정
cp .env.example .env
# DB_HOST, DB_USER, DB_PASSWORD, DB_NAME 설정 필요

# 2. 데이터베이스 초기 설정
node database/schema.sql  # MySQL에서 직접 실행
node scripts/create-academy-tables.js
node scripts/create-student-events-table.js

# 3. 서버 실행
npm start  # 또는 npm run dev
```

### 주요 명령어
```bash
npm start          # 프로덕션 서버 시작
npm run dev        # 개발 서버 시작 (동일)
```

## 핵심 아키텍처 개념

### 1. 멀티테넌시 데이터 격리

**3계층 보안 시스템**:
1. **미들웨어 계층**: `requireAcademy` - 모든 요청에서 `req.academyId` 주입 및 검증
2. **Model 계층**: 모든 쿼리 메서드의 첫 번째 파라미터가 `academyId`이며, `WHERE academy_id = ?` 강제
3. **데이터베이스 계층**: `academy_id NOT NULL` + Foreign Key 제약조건

**중요**: 모든 학생 관련 CRUD 작업은 반드시 `academyId`를 첫 번째 인자로 받아야 함.

```javascript
// ✅ 올바른 패턴
StudentModel.findAll(academyId, filters)
StudentModel.update(academyId, studentId, data)

// ❌ 잘못된 패턴 (절대 사용 금지)
StudentModel.findAll(filters)  // academyId 누락
```

### 2. 이벤트 기반 통계 시스템

**문제**: 기존 상태 기반 통계는 "이번달 신규 4명 중 1명이 퇴원하면 신규가 3명으로 표시"되는 문제 발생

**해결**: `student_events` 테이블로 이벤트 기록
- `join`: 신규 입학
- `rejoin`: 재원
- `exit`: 퇴원

**자동 이벤트 기록**:
- 학생 생성 시 → `join` 이벤트 자동 생성 (`src/controllers/students.controller.js:109`)
- 퇴원 처리 시 → `exit` 이벤트 자동 생성 (`:176`)
- 재원 처리 시 → `rejoin` 이벤트 자동 생성 (`:204`)

**통계 조회**:
```javascript
// StatisticsService는 student_events 테이블 사용
StudentEventModel.countNew(academyId, startDate, endDate)
StudentEventModel.countExit(academyId, startDate, endDate)
```

### 3. 인증 및 권한 미들웨어 체인

**모든 보호된 라우트는 다음 순서로 미들웨어 적용**:
```javascript
router.use(requireAuth, requireAcademy)
```

- `requireAuth` (`src/middleware/auth.middleware.js`): 로그인 확인, `req.user` 주입
- `requireAcademy` (`src/middleware/academy.middleware.js`): 학원 선택 확인, `req.academyId` 주입

### 4. MVC 아키텍처 패턴

```
요청 → Routes → Controller → Service/Model → Database
응답 ← EJS View ← Controller ← Service/Model ← Database
```

**계층 역할**:
- **Routes** (`src/routes/`): URL 매핑, 미들웨어 적용
- **Controllers** (`src/controllers/`): 요청/응답 처리, 비즈니스 로직 호출
- **Models** (`src/models/`): 데이터베이스 쿼리 (Raw SQL with mysql2)
- **Services** (`src/services/`): 복잡한 비즈니스 로직 (통계, OCR, Excel)
- **Views** (`views/`): EJS 템플릿

### 5. 프론트엔드 구조

**모듈화된 JavaScript**:
- `public/js/common.js`: 공통 유틸리티 (API 호출, 날짜 포맷)
- `public/js/api.js`: API 클라이언트 함수
- `public/js/students/`: 학생 관련 페이지별 스크립트
  - `list.js`: 목록 + 검색/필터
  - `detail.js`: 상세/수정
  - `new.js`: 신규 등록

**중요 패턴**:
- FormData를 객체로 변환 시 빈 문자열을 `null`로 처리 (`students/detail.js:256-263`)
- 날짜 필드는 ISO 8601에서 `YYYY-MM-DD`로 변환 (`detail.js:276`)

## 주요 파일 및 역할

### 핵심 Model
- `student.model.js`: 학생 CRUD (모든 메서드가 `academyId` 첫 번째 파라미터)
- `student-event.model.js`: 이벤트 기록 및 통계 조회 메서드
- `academy.model.js`: 학원 CRUD, 사용자-학원 연결 관리

### 핵심 Service
- `statistics.service.js`: 대시보드 통계, 차트 데이터 (이벤트 테이블 기반)
- `excel.service.js`: 엑셀 업로드/다운로드, XLSX 파싱
- `ocr.service.js`: Tesseract.js를 이용한 OCR 처리

### 설정 파일
- `src/config/constants.js`: 모든 애플리케이션 상수 (SESSION, PAGINATION, STUDENT_STATUS 등)
- `src/config/database.js`: MySQL2 연결 풀

### 유효성 검사
- `src/utils/validator.js`: 학생 데이터 검증 (빈 문자열/null 처리 주의 - 라인 8, 20, 27)

## 데이터베이스 스키마

### 핵심 테이블
- `users`: 사용자 계정
- `academies`: 학원 정보
- `user_academy_roles`: 사용자-학원 연결 (멀티테넌시)
- `students`: 학생 정보 (**academy_id NOT NULL 필수**)
- `student_events`: 학생 이벤트 기록 (통계용)

### 중요 인덱스
- `students.idx_academy_id`: 학원별 조회 최적화
- `student_events.idx_academy_date`: 학원+날짜 통계 쿼리 최적화
- `student_events.idx_academy_type_date`: 이벤트 타입별 필터링 최적화

## 코드 작성 규칙

### Model 메서드 시그니처
```javascript
/**
 * 모든 Model 메서드는 JSDoc 필수
 * @param {number} academyId - 학원 ID (항상 첫 번째 파라미터)
 * @param {number} id - 리소스 ID (해당시)
 * @param {Object} data - 데이터 객체 (해당시)
 * @returns {Promise<Type>} 반환 타입 명시
 */
static async methodName(academyId, ...) {
  const query = `SELECT * FROM table WHERE academy_id = ? AND ...`;
  const [rows] = await db.execute(query, [academyId, ...]);
  return rows;
}
```

### Controller 메서드 패턴
```javascript
async methodName(req, res) {
  try {
    const academyId = req.academyId;  // requireAcademy 미들웨어가 주입
    const result = await Model.method(academyId, ...);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('에러:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### 상수 사용
```javascript
// ✅ constants.js에서 import
const { PAGINATION, STUDENT_STATUS } = require('./config/constants');
const limit = PAGINATION.DEFAULT_LIMIT;

// ❌ 매직 넘버 사용 금지
const limit = 20;
```

## 주요 기능 구현 위치

### 학생 등록 플로우
1. 일반 등록: `students.controller.js:create()` → `student.model.js:create()` → 자동 `join` 이벤트 생성
2. 엑셀 일괄 등록: `students.controller.js:bulkCreate()` → `excel.service.js:parseExcel()` → `student.model.js:bulkCreate()`

### 통계 대시보드
- **컨트롤러**: `dashboard.controller.js:getStats()`
- **서비스**: `statistics.service.js:getDashboardStats(academyId)`
- **이벤트 집계**: `StudentEventModel.countNew()`, `countExit()`

### 학생 검색/필터링
- **라우트**: `/api/students?status=active&search=김`
- **컨트롤러**: `students.controller.js:getList()`
- **모델**: `student.model.js:findAll(academyId, filters)` - 동적 WHERE 절 생성

## 데이터 마이그레이션

기존 데이터가 있을 경우 다음 스크립트 순서대로 실행:
```bash
node scripts/cleanup-and-enforce-academy-id.js  # academy_id 정리
node scripts/create-student-events-table.js     # 이벤트 테이블 생성
node scripts/migrate-student-events.js          # 이벤트 데이터 마이그레이션
```

## 문제 해결 체크리스트

### "수정에 실패했습니다" 에러
- FormData 빈 문자열 → `null` 변환 확인 (`students/detail.js:256-263`)
- Validator에서 `typeof` 체크 확인 (`validator.js:8, 20, 27`)
- 날짜 형식 `YYYY-MM-DD` 확인

### 통계가 부정확
- `student_events` 테이블에 이벤트가 기록되었는지 확인
- `StatisticsService`가 `StudentEventModel`을 사용하는지 확인 (NOT `StudentModel`)

### 다른 학원 데이터가 보임
- 미들웨어 체인 확인: `requireAuth, requireAcademy` 순서
- Model 메서드 호출 시 `academyId` 첫 번째 인자 확인
- SQL 쿼리에 `WHERE academy_id = ?` 조건 확인

## 배포 전 체크리스트
- [ ] `.env`에서 `SESSION_SECRET` 변경
- [ ] `NODE_ENV=production` 설정
- [ ] 데이터베이스 백업
- [ ] 이벤트 테이블 마이그레이션 완료
- [ ] 학원별 데이터 격리 테스트 (최소 2개 학원)
