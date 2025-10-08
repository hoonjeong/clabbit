# 클래빗(Clabbit) 학원 관리 시스템 - 완전한 설치 가이드

## 📋 목차
1. [시스템 요구사항](#시스템-요구사항)
2. [설치 단계](#설치-단계)
3. [데이터베이스 초기화](#데이터베이스-초기화)
4. [서버 실행](#서버-실행)
5. [첫 사용 설정](#첫-사용-설정)
6. [문제 해결](#문제-해결)

---

## 🖥️ 시스템 요구사항

### 필수 소프트웨어
- **Node.js**: v16.0.0 이상
- **MySQL**: v8.0 이상
- **npm**: v7.0.0 이상

### 권장 환경
- **OS**: Windows 10/11, macOS 10.15+, Ubuntu 20.04+
- **RAM**: 4GB 이상
- **저장공간**: 2GB 이상

---

## 📦 설치 단계

### 1. 프로젝트 클론 (이미 완료된 경우 건너뛰기)

```bash
git clone https://github.com/yourusername/clabbit.git
cd clabbit
```

### 2. 의존성 패키지 설치

```bash
npm install
```

**설치되는 주요 패키지:**
- Express (웹 서버)
- MySQL2 (데이터베이스)
- bcrypt (비밀번호 암호화)
- Socket.io (실시간 통신)
- Tesseract.js (OCR)
- Chart.js (차트)
- 기타 30+ 패키지

### 3. 환경 변수 설정

`.env.example` 파일을 `.env`로 복사:

```bash
# Windows
copy .env.example .env

# macOS/Linux
cp .env.example .env
```

`.env` 파일 수정:

```env
# Application
PORT=3000
NODE_ENV=development

# Database Configuration (필수 수정!)
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_username        # MySQL 사용자명으로 변경
DB_PASSWORD=your_mysql_password    # MySQL 비밀번호로 변경
DB_NAME=clabbit

# Session Secret (프로덕션에서 반드시 변경!)
SESSION_SECRET=your-very-long-random-secret-key-change-this

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Email Configuration (선택사항)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=your-email-password
```

---

## 🗄️ 데이터베이스 초기화

### 방법 1: 자동 초기화 스크립트 (권장)

**완전한 데이터베이스 생성 및 초기화:**

```bash
node scripts/initialize-complete-database.js
```

이 스크립트는 다음을 수행합니다:
- ✅ `clabbit` 데이터베이스 생성
- ✅ 모든 테이블 생성 (30+ 테이블)
- ✅ Foreign Key 제약조건 설정
- ✅ 인덱스 최적화
- ✅ 초기 데이터 확인

**성공 시 출력 예시:**
```
✅ 클래빗 데이터베이스 초기화 완료!
총 35개의 테이블이 생성되었습니다
```

### 방법 2: 수동 초기화

**MySQL 접속:**

```bash
mysql -u root -p
```

**SQL 파일 실행:**

```sql
source C:/Users/hoonj/project/clabbit/clabbit/database/complete-schema.sql
```

또는 MySQL Workbench에서 `database/complete-schema.sql` 파일을 열어서 실행

### 데이터베이스 구조 확인

```bash
node scripts/check-all-tables.js
```

**생성되는 주요 테이블:**
- `users` - 사용자 계정
- `academies` - 학원 정보
- `user_academy_roles` - 사용자-학원 관계
- `students` - 학생 정보
- `student_events` - 학생 이벤트 (통계용)
- `teachers` - 강사 정보
- `classes` - 수업 정보
- `enrollments` - 수강 신청
- `attendance_records` - 출결 기록
- `student_charges` - 청구
- `payment_records` - 수납
- `exams` - 시험
- `student_scores` - 성적
- `consultations` - 상담
- `announcements` - 공지사항
- 기타 20+ 테이블

---

## 🚀 서버 실행

### 개발 모드 실행

```bash
npm start
# 또는
npm run dev
```

**서버 시작 확인:**
```
✅ 클래빗 서버가 포트 3000에서 실행중입니다.
   http://localhost:3000
🔌 WebSocket 서버가 시작되었습니다.
📅 자동 청구 스케줄러가 시작되었습니다.
```

### 브라우저에서 접속

http://localhost:3000

---

## 👤 첫 사용 설정

### 1. 회원가입

1. 메인 페이지에서 **"시작하기"** 클릭
2. 회원가입 폼 작성:
   - 이메일
   - 비밀번호 (6자 이상)
   - 이름
   - 전화번호
3. **"가입하기"** 클릭

### 2. 학원 등록

회원가입 후 자동으로 학원 등록 페이지로 이동합니다.

**필수 정보:**
- 학원명
- 학원등록번호
- 사업자등록번호

**선택 정보:**
- 학원운영등록증 사진 (OCR 자동 인식)
- 사업자등록증 사진 (OCR 자동 인식)
- 주소
- 연락처

**OCR 기능:**
- 등록증 사진을 업로드하면 자동으로 등록번호 추출
- 추출된 정보 확인 후 수정 가능

### 3. 학원 선택

여러 학원을 등록한 경우, 작업할 학원을 선택합니다.

### 4. 대시보드 접속

학원 선택 후 대시보드로 이동하여 시스템 사용을 시작합니다.

---

## 📊 주요 기능 사용 가이드

### 학생 관리

1. **학생 추가**
   - 대시보드 → "학생관리" → "+ 학생 추가"
   - 필수: 이름, 보호자 연락처
   - 선택: 생년월일, 학년, 학교, 주소 등

2. **엑셀 일괄 등록**
   - "학생관리" → "일괄 등록"
   - 엑셀 템플릿 다운로드
   - 데이터 입력 후 업로드

3. **학생 검색/필터**
   - 이름, 전화번호로 검색
   - 학년, 상태로 필터링

### 수업 관리

1. **수업 추가**
   - "수업관리" → "+ 수업 추가"
   - 수업명, 강사, 수강료, 시간표 입력

2. **학생 수강 신청**
   - 수업 상세 → "학생 추가"
   - 학생 선택 후 등록

### 출결 관리

1. **일일 출결 체크**
   - "출결관리" → "일일 출결"
   - 학생별 출석/결석/지각 선택

2. **QR 코드 출결**
   - "출결관리" → "키오스크 모드"
   - 학생이 QR 코드로 직접 체크인

### 청구/수납

1. **자동 청구 생성**
   - "청구/수납" → "청구 생성"
   - 수업별 자동 청구서 생성

2. **수납 처리**
   - 청구 목록에서 "수납" 클릭
   - 납부 금액, 방법 입력

### 성적 관리

1. **시험 등록**
   - "성적관리" → "시험 추가"
   - 시험명, 날짜, 총점 입력

2. **성적 입력**
   - 시험 선택 → "성적 입력"
   - 학생별 점수 입력

### 상담 관리

1. **상담 예약**
   - "상담관리" → "상담 추가"
   - 학생, 날짜, 주제 선택

2. **실시간 메시지**
   - 상담 상세 → 메시지 입력
   - 학부모와 실시간 소통

---

## 🔧 문제 해결

### 데이터베이스 연결 실패

**증상:**
```
❌ 데이터베이스 연결 오류: Access denied
```

**해결 방법:**
1. `.env` 파일의 `DB_USER`, `DB_PASSWORD` 확인
2. MySQL 서버 실행 상태 확인:
   ```bash
   # Windows
   net start MySQL80

   # macOS
   brew services start mysql

   # Linux
   sudo systemctl start mysql
   ```
3. MySQL 사용자 권한 확인:
   ```sql
   GRANT ALL PRIVILEGES ON clabbit.* TO 'your_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### 포트 충돌 오류

**증상:**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**해결 방법:**
1. 다른 포트 사용:
   ```env
   PORT=3001
   ```
2. 또는 기존 프로세스 종료:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID [프로세스ID] /F

   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

### npm install 오류

**증상:**
```
npm ERR! code ELIFECYCLE
```

**해결 방법:**
1. npm 캐시 삭제:
   ```bash
   npm cache clean --force
   ```
2. node_modules 삭제 후 재설치:
   ```bash
   # Windows
   rmdir /s /q node_modules
   del package-lock.json

   # macOS/Linux
   rm -rf node_modules package-lock.json

   npm install
   ```

### OCR 기능 오류

**증상:**
OCR이 작동하지 않거나 느림

**해결 방법:**
1. Tesseract 언어 파일 확인:
   - `kor.traineddata` 파일이 프로젝트 루트에 있는지 확인
2. 이미지 품질 확인:
   - 고해상도 이미지 사용
   - 텍스트가 명확히 보이는 사진 사용

### 세션 로그아웃 문제

**증상:**
자주 로그아웃됨

**해결 방법:**
1. `.env`에서 `SESSION_SECRET` 설정 확인
2. MySQL 세션 테이블 확인:
   ```sql
   SHOW TABLES LIKE 'sessions';
   ```
3. 세션 테이블이 없으면 자동 생성됨 (첫 로그인 시)

---

## 📞 지원

### 문제 보고
- GitHub Issues: [프로젝트 Issues 페이지]
- 이메일: support@clabbit.com

### 문서
- CLAUDE.md - 개발자 가이드
- README.md - 프로젝트 개요

### 업데이트
```bash
git pull origin master
npm install
node scripts/initialize-complete-database.js
```

---

## ✅ 체크리스트

시스템 설정 완료 확인:

- [ ] Node.js, MySQL 설치 완료
- [ ] npm install 성공
- [ ] .env 파일 설정 완료
- [ ] 데이터베이스 초기화 완료
- [ ] 서버 정상 실행
- [ ] 브라우저 접속 확인
- [ ] 회원가입 성공
- [ ] 학원 등록 완료
- [ ] 대시보드 접속 확인

모든 항목이 체크되면 클래빗 사용 준비가 완료되었습니다! 🎉

---

**마지막 업데이트:** 2025-10-08
**버전:** 1.0.0
