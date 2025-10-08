# 클래빗(Clabbit) - 빠른 시작 가이드

## ⚡ 5분 안에 시작하기

### 1️⃣ 설치 (첫 실행 시에만)

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정
copy .env.example .env
# .env 파일을 열어서 DB_USER, DB_PASSWORD 수정

# 3. 데이터베이스 초기화
node scripts/initialize-complete-database.js
```

### 2️⃣ 서버 실행

```bash
npm start
```

### 3️⃣ 브라우저 접속

http://localhost:3000

---

## 🎯 주요 기능 바로가기

### 회원가입 및 로그인
1. 메인 페이지 → "시작하기"
2. 이메일, 비밀번호 입력
3. 회원가입 완료

### 학원 등록
1. 로그인 후 자동으로 학원 등록 페이지 이동
2. 학원명, 등록번호, 사업자번호 입력
3. (선택) 등록증 사진 업로드 → OCR 자동 인식
4. 등록 완료

### 학생 추가
- **개별 등록**: 대시보드 → 학생관리 → + 학생 추가
- **일괄 등록**: 학생관리 → 일괄 등록 → 엑셀 업로드

### 수업 만들기
1. 대시보드 → 수업관리 → + 수업 추가
2. 수업명, 강사, 수강료, 시간 입력
3. 학생 추가 → 수강 신청

### 출결 체크
- **수동**: 출결관리 → 일일 출결 → 학생별 체크
- **QR코드**: 출결관리 → 키오스크 모드 → 학생이 QR 스캔

### 청구서 생성
1. 청구/수납 → 청구 생성
2. 대상 선택 (수업별/학생별)
3. 자동 생성 완료

---

## 📁 주요 파일 위치

### 설정 파일
- `.env` - 환경 변수 (DB 정보, 포트 등)
- `server.js` - 서버 진입점

### 데이터베이스
- `database/complete-schema.sql` - 완전한 DB 스키마
- `scripts/initialize-complete-database.js` - DB 초기화

### 문서
- `SETUP_GUIDE.md` - 상세 설치 가이드
- `DEVELOPMENT_COMPLETE.md` - 완료 보고서
- `CLAUDE.md` - 개발자 가이드

---

## 🔧 자주 사용하는 명령어

### 서버 관리
```bash
npm start              # 서버 시작
npm run dev            # 개발 모드 (동일)
```

### 데이터베이스
```bash
# 완전 초기화
node scripts/initialize-complete-database.js

# 학원 테이블 생성
node scripts/create-academy-tables.js

# 학생 이벤트 테이블
node scripts/create-student-events-table.js

# 모든 테이블 확인
node scripts/check-all-tables.js
```

### MySQL 직접 접속
```bash
mysql -u root -p
USE clabbit;
SHOW TABLES;
```

---

## 💡 유용한 팁

### 비밀번호 잊어버렸을 때
MySQL에서 직접 수정:
```sql
USE clabbit;
UPDATE users SET password = '$2b$10$...' WHERE email = 'your@email.com';
```

### 학원 데이터 초기화
```sql
DELETE FROM students WHERE academy_id = 1;
DELETE FROM classes WHERE academy_id = 1;
-- 주의: 모든 데이터가 삭제됩니다!
```

### 포트 변경
`.env` 파일에서:
```env
PORT=3001
```

---

## ❓ 문제 해결

### 서버가 안 켜져요
```bash
# 1. MySQL 서버 확인
net start MySQL80

# 2. .env 파일 확인
# DB_USER, DB_PASSWORD가 맞는지 확인

# 3. 포트 충돌 확인
# PORT를 3001로 변경해보세요
```

### 데이터베이스 오류
```bash
# 데이터베이스 재초기화
node scripts/initialize-complete-database.js

# 또는 MySQL에서 직접
mysql -u root -p
DROP DATABASE clabbit;
source database/complete-schema.sql
```

### 로그인이 안 돼요
1. 이메일, 비밀번호 확인
2. MySQL에서 사용자 확인:
```sql
SELECT * FROM users WHERE email = 'your@email.com';
```
3. 세션 테이블 확인:
```sql
SHOW TABLES LIKE 'sessions';
```

---

## 📞 도움말

### 상세 가이드
- 설치: `SETUP_GUIDE.md`
- 개발: `CLAUDE.md`
- 완료 보고서: `DEVELOPMENT_COMPLETE.md`

### 시스템 구조
```
localhost:3000
├── / (메인)
├── /login (로그인)
├── /signup (회원가입)
├── /academies/select (학원 선택)
├── /dashboard (대시보드)
├── /students (학생관리)
├── /classes (수업관리)
├── /teachers (강사관리)
├── /attendance (출결관리)
├── /billing (청구/수납)
├── /performance (성적관리)
└── /consultation (상담관리)
```

---

## ✅ 체크리스트

시작하기 전에 확인:
- [ ] Node.js 설치됨
- [ ] MySQL 설치 및 실행 중
- [ ] `npm install` 완료
- [ ] `.env` 파일 설정 완료
- [ ] 데이터베이스 초기화 완료
- [ ] `http://localhost:3000` 접속 확인

모두 체크되면 시작 준비 완료! 🚀

---

**빠른 시작:** `npm install` → `.env 수정` → `node scripts/initialize-complete-database.js` → `npm start`

**최종 업데이트:** 2025-10-08
