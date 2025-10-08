# 클래빗 전체 리팩토링 계획서

## 📅 작성일: 2025-10-08

## 🎯 리팩토링 목표

프로젝트의 **모든 기능을 100% 보존**하면서 코드 품질, 성능, 보안을 개선합니다.

---

## 📊 현재 프로젝트 상태

### 프로젝트 구조
- **Backend**: Node.js + Express + MySQL
- **Frontend**: EJS 템플릿 + Vanilla JavaScript
- **Architecture**: 이미 MVC 패턴으로 구조화됨

### 기존 파일 구조
```
src/
├── config/              ✅ 이미 존재
│   ├── database.js
│   ├── constants.js
│   └── websocket.js
│
├── models/              ✅ 이미 존재 (40+ 모델)
│   ├── student.model.js
│   ├── academy.model.js
│   └── ...
│
├── services/            ✅ 이미 존재 (15+ 서비스)
│   ├── statistics.service.js
│   ├── excel.service.js
│   └── ...
│
├── controllers/         ✅ 이미 존재 (15+ 컨트롤러)
│   ├── students.controller.js
│   ├── academy.controller.js
│   └── ...
│
├── routes/              ✅ 이미 존재 (15+ 라우트)
│   ├── index.js
│   ├── students.routes.js
│   └── ...
│
├── middleware/          ✅ 이미 존재
│   ├── auth.middleware.js
│   ├── academy.middleware.js
│   └── error.middleware.js
│
└── utils/               ✅ 이미 존재
    ├── security.js
    ├── validator.js
    ├── response.js
    └── ...
```

### 기존 보안 조치
- ✅ `.env.example` 파일 존재
- ✅ 환경변수 사용 중
- ✅ 세션 기반 인증
- ✅ 멀티테넌시 데이터 격리 (academyId)
- ⚠️ SQL Injection 방지 확인 필요
- ⚠️ XSS 방지 확인 필요

### 기존 유틸리티
- ✅ `src/utils/security.js` - 보안 함수
- ✅ `src/utils/response.js` - 응답 포맷
- ✅ `src/utils/validator.js` - 유효성 검사
- ✅ `src/utils/dateHelper.js` - 날짜 처리
- ✅ `src/utils/logger.js` - 로깅

---

## 🔍 리팩토링 우선순위

프로젝트가 이미 잘 구조화되어 있으므로, **점진적이고 안전한 개선**에 집중합니다.

### ⭐⭐⭐ 최우선 (Phase 1-3)
1. **보안 강화** - SQL Injection, XSS 방지 점검
2. **코드 품질** - 일관성 검사 및 개선
3. **중복 코드 제거** - DRY 원칙 적용

### ⭐⭐ 우선 (Phase 4-6)
4. **Model 레이어 통일** - 패턴 일관성 확보
5. **Service 레이어 검토** - 비즈니스 로직 최적화
6. **Controller 레이어 정리** - 에러 처리 통일

### ⭐ 일반 (Phase 7-10)
7. **데이터베이스 최적화** - 인덱스 추가
8. **불필요한 코드 제거** - 사용하지 않는 파일 정리
9. **에러 처리 표준화** - 일관된 에러 응답
10. **문서화** - README 및 주석 개선

---

## 📋 Phase별 작업 계획

### Phase 0: 사전 준비 ✅
- [x] Git 백업 태그 생성
- [x] `.gitignore` 개선
- [x] 리팩토링 계획서 작성

### Phase 1: 보안 점검
- [ ] SQL Injection 취약점 스캔
- [ ] Prepared Statements 사용 확인
- [ ] XSS 방지 확인
- [ ] 비밀번호 해싱 확인 (bcrypt)
- [ ] 환경변수 하드코딩 확인

### Phase 2: 코드 품질
- [ ] ESLint 설정 (선택사항)
- [ ] 코드 스타일 통일
- [ ] 중복 코드 탐지 및 제거
- [ ] 매직 넘버 상수화

### Phase 3: Model 레이어
- [ ] 모든 Model 메서드 패턴 확인
- [ ] academyId 사용 일관성 확인
- [ ] 에러 처리 통일
- [ ] JSDoc 주석 추가

### Phase 4: Service 레이어
- [ ] 복잡한 비즈니스 로직 검토
- [ ] Service 분리 필요성 확인
- [ ] 통계 계산 로직 최적화

### Phase 5: Controller 레이어
- [ ] 에러 처리 패턴 통일
- [ ] 응답 포맷 일관성 확인
- [ ] try-catch 블록 검토

### Phase 6: Routes
- [ ] 라우트 구조 검토
- [ ] 미들웨어 순서 확인
- [ ] 404 처리 확인

### Phase 7: 데이터베이스
- [ ] 인덱스 분석 및 추가
- [ ] 쿼리 성능 최적화
- [ ] N+1 문제 확인

### Phase 8: 코드 정리
- [ ] 사용하지 않는 파일 삭제
- [ ] console.log 제거
- [ ] 주석 처리된 코드 제거
- [ ] 의존성 정리

### Phase 9: 에러 처리
- [ ] 전역 에러 핸들러 확인
- [ ] 404 핸들러 확인
- [ ] 에러 로깅 개선

### Phase 10: 문서화
- [ ] README.md 업데이트
- [ ] API 문서 정리
- [ ] 주요 함수 JSDoc 추가
- [ ] 배포 가이드 작성

---

## 🚨 안전 수칙

### 절대 원칙
1. ✅ **기능 보존**: 모든 기능이 리팩토링 전후 동일하게 작동
2. ✅ **단계별 진행**: 파일 하나씩 수정 후 테스트
3. ✅ **백업 필수**: 중요 수정 전 커밋
4. ✅ **즉시 테스트**: 파일 수정 후 즉시 해당 기능 테스트
5. ✅ **Git 커밋**: 각 Phase 완료 후 커밋

### 금지사항
1. ❌ **로직 변경 금지**: 조건문, 쿼리, 계산식 변경 금지
2. ❌ **API 응답 변경 금지**: 프론트엔드가 의존하는 응답 구조 변경 금지
3. ❌ **새 기능 추가 금지**: 리팩토링은 정리만, 기능 추가는 별도 작업
4. ❌ **한 번에 여러 파일 수정 금지**: 파일 하나씩 수정 후 테스트

---

## 📈 성과 측정 (리팩토링 후)

### 개선 목표
- [ ] 보안 취약점 0개
- [ ] 코드 중복률 < 5%
- [ ] 테스트 커버리지 > 70% (선택사항)
- [ ] 일관된 코드 스타일
- [ ] 완전한 문서화

### 성과 지표
- Before/After 코드 라인 수
- Before/After 파일 수
- 발견된 보안 취약점 수
- 제거된 중복 코드 비율
- 추가된 인덱스 수

---

## 📌 참고사항

### 프로젝트 특성
- **멀티테넌시**: 모든 데이터는 academy_id로 격리됨
- **세션 기반 인증**: requireAuth + requireAcademy 미들웨어
- **이벤트 기반 통계**: student_events 테이블 사용
- **엑셀 기능**: 학생 일괄 등록 지원
- **OCR 기능**: Tesseract.js 사용

### 중요 파일
- `CLAUDE.md`: 프로젝트 가이드
- `server.js`: 서버 진입점
- `src/routes/index.js`: 라우트 통합
- `src/config/database.js`: DB 연결
- `src/config/constants.js`: 상수 정의

---

## 🔄 진행 상황

- [x] Phase 0: 사전 준비
- [ ] Phase 1: 보안 점검
- [ ] Phase 2: 코드 품질
- [ ] Phase 3: Model 레이어
- [ ] Phase 4: Service 레이어
- [ ] Phase 5: Controller 레이어
- [ ] Phase 6: Routes
- [ ] Phase 7: 데이터베이스
- [ ] Phase 8: 코드 정리
- [ ] Phase 9: 에러 처리
- [ ] Phase 10: 문서화

**예상 완료일**: 2025-10-15 (1주일 예상)

---

**Last Updated**: 2025-10-08
**Status**: Phase 0 완료, Phase 1 시작 준비
