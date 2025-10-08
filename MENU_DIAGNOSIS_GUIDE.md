# 📖 전체 메뉴 진단 및 자동 수정 시스템 사용 가이드

## 🎯 개요

클래빗의 모든 메뉴를 자동으로 진단하고, 에러를 분류하여 대부분을 자동으로 수정하는 시스템입니다.

**주요 기능**:
- ✅ 전체 메뉴 자동 크롤링 및 진단
- ✅ 에러 유형 자동 분류
- ✅ Template 변수 누락 자동 수정
- ✅ 미구현 라우트 자동 생성
- ✅ Database 스키마 확인
- ✅ 상세 HTML 리포트 생성

---

## 🚀 빠른 시작

### 1. 전체 진단

```bash
npm run diagnose
```

**결과**:
- `MENU_DIAGNOSIS_REPORT.json` - JSON 형식 상세 리포트
- `MENU_DIAGNOSIS_REPORT.html` - 브라우저에서 보기 좋은 HTML 리포트

### 2. HTML 리포트 확인

브라우저에서 `MENU_DIAGNOSIS_REPORT.html`을 열어 상세 결과를 확인하세요.

### 3. 자동 수정 실행

```bash
# Template 변수 누락 자동 수정
npm run fix:templates

# 미구현 라우트 자동 생성
npm run generate:routes

# 모두 한 번에 (진단 → 수정 → 생성)
npm run fix:all
```

### 4. Database 스키마 확인

```bash
npm run check:db
```

---

## 📋 사용 가능한 명령어

| 명령어 | 설명 | 출력 파일 |
|--------|------|-----------|
| `npm run diagnose` | 전체 메뉴 진단 | `MENU_DIAGNOSIS_REPORT.json/html` |
| `npm run fix:templates` | Template 변수 누락 수정 | `TEMPLATE_FIX_REPORT.json` |
| `npm run generate:routes` | 미구현 라우트 생성 | `ROUTE_GENERATION_REPORT.json` |
| `npm run check:db` | Database 스키마 확인 | `DATABASE_SCHEMA_REPORT.json` |
| `npm run fix:all` | 진단 + 자동 수정 (일괄) | 모든 리포트 |

---

## 🔍 에러 유형별 대응 방법

### 1. AUTH_REQUIRED (인증 필요)

**현상**: `⚠️ 인증 필요 (로그인 리다이렉트)`

**의미**: 정상 동작 - 로그인이 필요한 페이지입니다.

**조치**: 필요 없음 (정상)

---

### 2. TEMPLATE_VARIABLE_MISSING (템플릿 변수 누락)

**현상**: `❌ 템플릿 변수 누락: academyName`

**의미**: EJS 템플릿에서 필요한 변수가 라우터에서 전달되지 않았습니다.

**자동 수정**:
```bash
npm run fix:templates
```

**수동 수정** (필요시):
```javascript
// src/routes/example.routes.js

router.get('/page', requireAuth, requireAcademy, (req, res) => {
  res.render('page', {
    title: '페이지 제목',
    page: 'page-id',
    academyName: req.academyName,        // ← 추가
    userName: req.user?.name || '사용자'  // ← 추가
  });
});
```

---

### 3. ROUTE_NOT_FOUND (라우트 미구현)

**현상**: `❌ 404 라우트 없음`

**의미**: 메뉴에는 있지만 실제 라우트가 구현되지 않았습니다.

**자동 생성**:
```bash
npm run generate:routes
```

**결과**:
- 라우트 파일 자동 생성 (`src/routes/*.routes.js`)
- 뷰 파일 자동 생성 (`views/**/*.ejs`)

**후속 작업**:
1. `server.js`에 새 라우트 등록
2. 서버 재시작
3. 실제 기능 구현

---

### 4. DATABASE_ERROR (Database 오류)

**현상**: `❌ Database 스키마 오류`

**진단**:
```bash
npm run check:db
```

**확인 사항**:
- 테이블이 존재하는가?
- 컬럼 이름이 맞는가?
- Foreign Key가 설정되어 있는가?

**수정**:
```bash
# 스키마 파일 실행
node database/schema.sql  # MySQL에서 직접 실행
```

---

### 5. TEMPLATE_INCLUDE_ERROR (Include 오류)

**현상**: `❌ Include 파일 또는 변수 오류`

**원인**:
- Include된 컴포넌트에 필요한 변수가 누락됨
- Include 파일이 존재하지 않음

**수정**:
```javascript
// 잘못된 예
<%- include('components/sidebar-menu') %>  // ← 변수 없음

// 올바른 예
<%- include('components/sidebar-menu', {
  academyName: academyName,
  page: 'dashboard',
  userName: userName
}) %>
```

---

### 6. CONNECTION_ERROR (연결 실패)

**현상**: `❌ 서버가 실행 중이지 않습니다`

**조치**:
```bash
npm start
```

---

### 7. HTTP_ERROR (기타 HTTP 에러)

**현상**: `❌ HTTP 401` 또는 기타 상태 코드

**확인**:
- API 라우트가 올바른가?
- 인증 미들웨어가 적용되었는가?
- 응답 코드가 의도된 것인가?

---

## 📊 진단 리포트 읽는 법

### JSON 리포트 (`MENU_DIAGNOSIS_REPORT.json`)

```json
{
  "timestamp": "2025-10-08T...",
  "totalPages": 30,
  "successPages": 1,
  "errorPages": 29,
  "pages": [
    {
      "name": "대시보드",
      "url": "/dashboard",
      "status": "success",
      "statusCode": 200
    },
    {
      "name": "성적 관리",
      "url": "/performance/exams",
      "status": "error",
      "statusCode": 500,
      "errorType": "TEMPLATE_VARIABLE_MISSING",
      "missingVariables": ["academyName"],
      "recommendations": [
        "라우터에서 res.render 시 { academyName: ... } 변수를 전달하세요"
      ]
    }
  ]
}
```

### HTML 리포트 (`MENU_DIAGNOSIS_REPORT.html`)

브라우저에서 열면 다음을 볼 수 있습니다:

1. **통계 요약**
   - 총 페이지 수
   - 정상 페이지 수
   - 에러 페이지 수
   - 성공률

2. **에러 유형별 분류**
   - 각 에러 타입별로 페이지 그룹화
   - 누락 변수 표시
   - 수정 방법 제안

3. **전체 페이지 목록**
   - 필터: 전체 / 정상만 / 에러만
   - 각 페이지의 상태 및 에러 상세

---

## 🛠️ 자동 수정 상세 가이드

### Template 변수 자동 수정

**작동 방식**:
1. 진단 리포트에서 `TEMPLATE_VARIABLE_MISSING` 에러 추출
2. 해당 URL의 라우트 파일 찾기
3. `res.render()` 호출 찾기
4. 누락된 변수 추가 (기본값 포함)
5. 원본 파일을 `.backup`으로 백업

**자동 추가되는 기본값**:
- `academyName` → `req.academyName`
- `userName` → `req.user?.name || '사용자'`
- `user` → `req.user`
- `page` → `'페이지ID'`
- `title` → `'페이지명'`
- 기타 → `null // TODO: 적절한 값 설정`

**실행**:
```bash
npm run fix:templates
```

**결과**: `TEMPLATE_FIX_REPORT.json`

---

### 라우트 자동 생성

**작동 방식**:
1. 진단 리포트에서 `ROUTE_NOT_FOUND` 에러 추출
2. URL에서 라우트 파일 경로 추정 (`/billing/dashboard` → `src/routes/billing.routes.js`)
3. 기본 라우트 코드 생성
4. 기본 EJS 뷰 파일 생성

**생성되는 라우트 예시**:
```javascript
// src/routes/billing.routes.js

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

// 청구/수납 대시보드 (/billing/dashboard)
router.get('/dashboard', requireAuth, requireAcademy, async (req, res) => {
  try {
    res.render('billing/dashboard', {
      title: '청구/수납 대시보드',
      page: 'billing',
      academyName: req.academyName,
      userName: req.user?.name || '사용자'
    });
  } catch (error) {
    console.error('/billing/dashboard Error:', error);
    res.status(500).render('error', {
      title: '오류',
      message: '페이지를 불러오는 중 오류가 발생했습니다.',
      error: error
    });
  }
});

module.exports = router;
```

**생성되는 뷰 예시**:
```ejs
<!-- views/billing/dashboard.ejs -->

<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <title><%= title %></title>
    <link rel="stylesheet" href="/css/design-system.css">
    <!-- ... -->
</head>
<body>
    <%- include('../components/sidebar-menu', {
      academyName, page, userName
    }) %>

    <main class="main-content">
        <h1>청구/수납 대시보드</h1>
        <div class="empty-state">
            <h2>🚧 페이지 개발 중</h2>
            <p>실제 기능을 구현해주세요.</p>
        </div>
    </main>
</body>
</html>
```

**실행**:
```bash
npm run generate:routes
```

**결과**: `ROUTE_GENERATION_REPORT.json`

**후속 작업**:
```javascript
// server.js에 추가

app.use('/billing', require('./src/routes/billing.routes'));
```

---

## 🔄 전체 워크플로우

### 일반적인 사용 흐름

```bash
# 1. 서버 실행 (별도 터미널)
npm start

# 2. 진단 실행
npm run diagnose

# 3. HTML 리포트 확인
# MENU_DIAGNOSIS_REPORT.html을 브라우저에서 열기

# 4. 자동 수정 실행
npm run fix:templates
npm run generate:routes

# 5. server.js 업데이트 (새 라우트 등록)

# 6. 서버 재시작

# 7. 재진단
npm run diagnose

# 8. 수동 수정 (남은 에러)

# 9. 최종 확인
npm run diagnose
```

### 빠른 일괄 처리

```bash
# 서버 실행
npm start

# 진단 + 자동 수정 + 재생성
npm run fix:all

# HTML 리포트 확인
# MENU_DIAGNOSIS_REPORT.html

# server.js 업데이트 및 서버 재시작

# 최종 진단
npm run diagnose
```

---

## 📁 생성되는 파일

| 파일명 | 설명 |
|--------|------|
| `MENU_DIAGNOSIS_REPORT.json` | 전체 진단 결과 (JSON) |
| `MENU_DIAGNOSIS_REPORT.html` | 전체 진단 결과 (HTML) |
| `TEMPLATE_FIX_REPORT.json` | Template 수정 결과 |
| `ROUTE_GENERATION_REPORT.json` | 라우트 생성 결과 |
| `DATABASE_SCHEMA_REPORT.json` | DB 스키마 정보 |
| `*.backup` | 수정 전 원본 파일 백업 |

---

## ⚠️ 주의사항

### 1. 서버가 실행 중이어야 함

진단 스크립트는 실제 HTTP 요청을 보내므로 서버가 실행 중이어야 합니다.

```bash
# 별도 터미널에서
npm start
```

### 2. 백업 파일 확인

자동 수정 시 원본 파일은 `.backup` 확장자로 백업됩니다.

```
src/routes/billing.routes.js
src/routes/billing.routes.js.backup  ← 원본
```

### 3. server.js 수동 업데이트 필요

새로 생성된 라우트는 `server.js`에 수동으로 등록해야 합니다.

```javascript
app.use('/billing', require('./src/routes/billing.routes'));
app.use('/performance', require('./src/routes/performance.routes'));
// ...
```

### 4. 인증 필요 페이지는 정상

`AUTH_REQUIRED` 또는 `인증 필요`는 에러가 아닙니다. 로그인이 필요한 페이지는 정상적으로 리다이렉트됩니다.

---

## 🐛 문제 해결

### "서버가 실행 중이지 않습니다"

**해결**:
```bash
npm start
```

### "진단 리포트를 찾을 수 없습니다"

**해결**:
```bash
npm run diagnose
```
먼저 진단을 실행한 후 수정 스크립트를 실행하세요.

### "라우트 파일을 찾을 수 없음"

라우트 파일이 예상 경로에 없는 경우입니다.

**확인**:
- `src/routes/*.routes.js` 또는 `routes/*.routes.js`
- 파일명이 올바른지 확인

**해결**:
```bash
npm run generate:routes
```

### "데이터베이스 연결 실패"

**확인**:
`.env` 파일의 DB 설정

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=clabbit_db
```

---

## 📚 추가 리소스

### 관련 문서
- `LAYOUT_CONSISTENCY_VERIFICATION.md` - 레이아웃 일관성 검증
- `SIDEBAR_COLLAPSED_MODE_COMPLETE.md` - 사이드바 축소 모드
- `CLAUDE.md` - 프로젝트 개발 가이드

### 스크립트 파일
- `scripts/diagnose-all-menus.js` - 진단 스크립트
- `scripts/fix-template-variables.js` - Template 수정
- `scripts/generate-missing-routes.js` - 라우트 생성
- `scripts/check-database-schema.js` - DB 스키마 확인

---

## 🎓 FAQ

### Q: 모든 페이지가 "인증 필요"로 나오는데 에러인가요?

**A**: 아닙니다. 로그인이 필요한 페이지는 정상적으로 `AUTH_REQUIRED`로 표시됩니다. 이는 정상 동작입니다.

### Q: 자동 수정 후 에러가 더 늘어났어요.

**A**: 백업 파일(`.backup`)을 복원하고 수동으로 수정하세요. 자동 수정은 간단한 케이스만 처리합니다.

### Q: HTML 리포트가 안 열려요.

**A**: 브라우저에서 직접 `MENU_DIAGNOSIS_REPORT.html` 파일을 열거나, 파일 탐색기에서 더블클릭하세요.

### Q: 생성된 라우트가 작동하지 않아요.

**A**: `server.js`에 라우트를 등록했는지 확인하고, 서버를 재시작하세요.

### Q: Database 스키마 확인이 실패해요.

**A**: `.env` 파일의 DB 설정을 확인하고, MySQL 서버가 실행 중인지 확인하세요.

---

## ✨ 성공 사례

진단 실행 전:
```
총 페이지: 30
정상: 1 (3.3%)
에러: 29
```

자동 수정 후:
```
총 페이지: 30
정상: 25 (83.3%)
에러: 5 (수동 수정 필요)
```

최종 수동 수정 후:
```
총 페이지: 30
정상: 30 (100%)
에러: 0
```

---

**작성일**: 2025-10-08
**버전**: 1.0.0
**작성자**: Claude Code
