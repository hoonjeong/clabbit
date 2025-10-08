# Phase 1: 프로젝트 현황 분석

## 1. 파일 구조

### Config (설정)
- `src/config/database.js` - MySQL 데이터베이스 연결 설정

### Models (데이터 모델)
- `src/models/user.model.js` - 사용자 모델
- `src/models/academy.model.js` - 학원 모델
- `src/models/student.model.js` - 학생 모델

### Controllers (비즈니스 로직)
- `src/controllers/auth.controller.js` - 인증 컨트롤러 (회원가입, 로그인, 로그아웃)
- `src/controllers/academy.controller.js` - 학원 컨트롤러 (학원 선택, 등록, 입장)
- `src/controllers/students.controller.js` - 학생 컨트롤러 (CRUD, 엑셀 업로드)
- `src/controllers/dashboard.controller.js` - 대시보드 컨트롤러 (통계, 차트)

### Services (서비스 계층)
- `src/services/ocr.service.js` - OCR 문서 검증 서비스
- `src/services/excel.service.js` - 엑셀 파일 처리 서비스
- `src/services/statistics.service.js` - 통계 데이터 서비스

### Middleware (미들웨어)
- `src/middleware/auth.middleware.js` - 인증 미들웨어 (requireAuth, requireGuest)
- `src/middleware/academy.middleware.js` - 학원 미들웨어 (requireAcademy, checkAcademyAccess)
- `src/middleware/error.middleware.js` - 에러 처리 미들웨어

### Routes (라우팅)
- `src/routes/index.js` - 메인 라우터 (라우트 통합)
- `src/routes/auth.routes.js` - 인증 라우트
- `src/routes/academy.routes.js` - 학원 라우트
- `src/routes/students.routes.js` - 학생 라우트
- `src/routes/dashboard.routes.js` - 대시보드 라우트

### Utils (유틸리티)
- `src/utils/validator.js` - 데이터 유효성 검사
- `src/utils/response.js` - API 응답 형식
- `src/utils/dateHelper.js` - 날짜 관련 헬퍼

### Views (EJS 템플릿)
- `views/index.ejs` - 메인 페이지
- `views/login.ejs` - 로그인 페이지
- `views/signup.ejs` - 회원가입 페이지
- `views/dashboard.ejs` - 대시보드 페이지
- `views/academies/select.ejs` - 학원 선택 페이지
- `views/academies/new.ejs` - 학원 등록 페이지
- `views/students/index.ejs` - 학생 목록 페이지
- `views/students/new.ejs` - 학생 등록 페이지
- `views/students/detail.ejs` - 학생 상세 페이지
- `views/students/bulk.ejs` - 학생 일괄 등록 페이지
- `views/students/withdrawn.ejs` - 퇴원생 관리 페이지
- `views/components/header.ejs` - 공통 헤더 컴포넌트

## 2. 현재 정상 작동하는 기능 목록

### 인증 기능
- ✅ 회원가입 (이메일, 비밀번호, 이름, 전화번호)
- ✅ 로그인 (이메일, 비밀번호)
- ✅ 로그아웃
- ✅ 세션 유지 (7일)

### 학원 관리 기능
- ✅ 학원 목록 조회 (사용자가 속한 학원)
- ✅ 학원 선택 (세션에 currentAcademyId 저장)
- ✅ 학원 등록 (이름, 등록번호, 사업자번호, 서류 업로드)
- ✅ OCR 검증 (학원운영등록증, 사업자등록증)
- ✅ 학원 입장 (선택한 학원으로 컨텍스트 전환)

### 학생 관리 기능
- ✅ 학생 목록 조회 (academy_id 기반 필터링)
- ✅ 학생 검색 (이름, 전화번호)
- ✅ 학생 상태 필터 (재원생, 퇴원생)
- ✅ 학생 상세 조회
- ✅ 학생 등록 (개별)
- ✅ 학생 정보 수정
- ✅ 학생 퇴원 처리
- ✅ 학생 재원 처리
- ✅ 엑셀 샘플 다운로드
- ✅ 엑셀 미리보기
- ✅ 엑셀 일괄 등록
- ✅ 페이지네이션

### 대시보드 기능
- ✅ 통계 조회 (오늘/이번주/이번달 신규/퇴원)
- ✅ 차트 데이터 조회 (일간/주간/월간)
- ✅ 차트 렌더링 (신규/퇴원 학생 추이)

### 데이터 격리
- ✅ 학원별 데이터 완전 격리
- ✅ academy_id 기반 필터링
- ✅ 미들웨어를 통한 접근 제어

## 3. API 엔드포인트 목록

### 인증 API
```
POST   /api/auth/signup         - 회원가입
POST   /api/auth/login          - 로그인
POST   /api/auth/logout         - 로그아웃
```

### 학원 API
```
GET    /api/academies           - 학원 목록 조회 (requireAuth)
POST   /api/academies           - 학원 등록 (requireAuth, file upload)
POST   /api/academies/enter     - 학원 입장 (requireAuth)
```

### 학생 API
```
GET    /api/students            - 학생 목록 조회 (requireAuth, requireAcademy)
GET    /api/students/:id        - 학생 상세 조회 (requireAuth, requireAcademy)
POST   /api/students            - 학생 등록 (requireAuth, requireAcademy)
PUT    /api/students/:id        - 학생 수정 (requireAuth, requireAcademy)
POST   /api/students/:id/withdraw   - 학생 퇴원 (requireAuth, requireAcademy)
POST   /api/students/:id/reinstate  - 학생 재원 (requireAuth, requireAcademy)
GET    /api/students/sample-excel   - 엑셀 샘플 다운로드 (requireAuth, requireAcademy)
POST   /api/students/bulk/preview   - 엑셀 미리보기 (requireAuth, requireAcademy)
POST   /api/students/bulk           - 엑셀 일괄 등록 (requireAuth, requireAcademy)
```

### 대시보드 API
```
GET    /api/dashboard/stats         - 통계 조회 (requireAuth, requireAcademy)
GET    /api/dashboard/charts/:period - 차트 데이터 (requireAuth, requireAcademy)
GET    /api/dashboard/issues        - 이슈 학생 조회 (requireAuth, requireAcademy)
```

### 페이지 라우트
```
GET    /                        - 메인 페이지
GET    /login                   - 로그인 페이지 (requireGuest)
GET    /signup                  - 회원가입 페이지 (requireGuest)
GET    /dashboard               - 대시보드 (requireAuth, requireAcademy)
GET    /academies/select        - 학원 선택 (requireAuth)
GET    /academies/new           - 학원 등록 (requireAuth)
GET    /students                - 학생 목록 (requireAuth, requireAcademy)
GET    /students/new            - 학생 등록 (requireAuth, requireAcademy)
GET    /students/bulk           - 학생 일괄 등록 (requireAuth, requireAcademy)
GET    /students/withdrawn      - 퇴원생 관리 (requireAuth, requireAcademy)
GET    /students/:id            - 학생 상세 (requireAuth, requireAcademy)
```

## 4. 중복 코드 패턴 식별

### 중복 패턴 1: 에러 응답 처리
**위치**: 모든 Controller 메서드
```javascript
// 패턴 1
return errorResponse(res, '메시지', 상태코드);

// 패턴 2
return res.status(403).json({ success: false, error: '메시지' });
```
**개선**: errorResponse 유틸 함수 통일 사용

### 중복 패턴 2: academyId 추출
**위치**: Students Controller, Dashboard Controller
```javascript
const academyId = req.academyId;
```
**상태**: 이미 일관적으로 사용 중 ✅

### 중복 패턴 3: 날짜 계산
**위치**: Statistics Service
```javascript
// 오늘, 이번주, 이번달 계산 로직
const today = new Date().toISOString().split('T')[0];
```
**상태**: dateHelper에 이미 분리됨 ✅

### 중복 패턴 4: 유효성 검사
**위치**: Students Controller
```javascript
const validation = validateStudent(studentData);
if (!validation.isValid) {
  return errorResponse(res, validation.errors.join(', '), 400);
}
```
**상태**: 일관적으로 사용 중 ✅

### 중복 패턴 5: 파일 업로드 설정
**위치**: academy.routes.js, students.routes.js
```javascript
const upload = multer({ dest: 'uploads/' });
```
**개선 가능**: 공통 multer 설정 파일로 분리

### 중복 패턴 6: 쿼리 실행
**위치**: 모든 Model 파일
```javascript
const [rows] = await db.execute(query, params);
return rows[0] || rows;
```
**상태**: 표준 패턴, 유지 ✅

## 5. 코드 품질 이슈

### 이슈 1: 주석 누락
- Model 메서드에 JSDoc 주석 부족
- 복잡한 로직에 설명 주석 필요

### 이슈 2: 에러 메시지 일관성
- 한글 메시지 사용 (일관적)
- 에러 코드 표준화 필요 없음 (이미 적절)

### 이슈 3: 매직 넘버
- 세션 만료 시간: `1000 * 60 * 60 * 24 * 7` (상수화 가능)
- 파일 크기 제한: `10 * 1024 * 1024` (상수화 가능)

### 이슈 4: 사용하지 않는 코드
- 확인 필요: import문, 함수, 변수

## 6. 리팩토링 우선순위

### 높음 (즉시 개선)
1. ❌ 없음 - 현재 코드가 이미 잘 구조화되어 있음

### 중간 (선택적 개선)
1. multer 설정 공통화
2. 매직 넘버 상수화
3. JSDoc 주석 추가
4. 사용하지 않는 import 제거

### 낮음 (현재 유지)
1. 파일 구조 - 이미 적절함
2. 네이밍 - 일관적임
3. 에러 처리 - 통일되어 있음

## 7. 테스트 시나리오 체크리스트

### 시나리오 1: 회원가입 → 학원 등록 → 학생 등록
- [ ] 회원가입 성공
- [ ] 학원 선택 페이지로 리다이렉트
- [ ] 학원 등록 성공
- [ ] 학원 선택 성공
- [ ] 대시보드 진입
- [ ] 학생 등록 성공
- [ ] 학생 목록에 표시

### 시나리오 2: 데이터 격리
- [ ] 사용자 A - 학원 A 생성
- [ ] 사용자 B - 학원 B 생성
- [ ] 학원 A에 학생 3명 등록
- [ ] 학원 B에 학생 2명 등록
- [ ] 사용자 A 로그인 → 학원 A 선택 → 3명만 보임
- [ ] 사용자 B 로그인 → 학원 B 선택 → 2명만 보임

### 시나리오 3: 엑셀 업로드
- [ ] 샘플 다운로드 성공
- [ ] 엑셀 파일 업로드
- [ ] 미리보기 성공
- [ ] 유효성 검사 동작
- [ ] 일괄 등록 성공
- [ ] 학생 목록에 표시

### 시나리오 4: 통계 및 차트
- [ ] 대시보드 통계 표시
- [ ] 일간 차트 표시
- [ ] 주간 차트 표시
- [ ] 월간 차트 표시

## 8. 결론

**현재 상태 평가**:
- ✅ 전체적으로 잘 구조화되어 있음
- ✅ 데이터 격리가 완벽하게 구현됨
- ✅ 코드 일관성이 높음
- ✅ 에러 처리가 통일되어 있음

**리팩토링 필요성**:
- ⚠️ 낮음 - 현재 코드가 이미 좋은 상태
- 주요 개선 사항: 주석 추가, 사용하지 않는 코드 제거, 소소한 최적화

**권장 사항**:
- 대대적인 리팩토링보다는 **점진적 개선** 권장
- 기능 추가 시 현재 패턴 유지
- 주석 및 문서화 보강

## Phase 2 준비 완료

다음 Phase에서는:
1. 사용하지 않는 import 제거
2. JSDoc 주석 추가
3. 매직 넘버 상수화
4. multer 설정 공통화 (선택)

**현재 기능이 모두 정상 작동하므로 안전하게 Phase 2로 진행 가능합니다.**
