# 소통 관리 및 수업 관리 모듈 구현 완료

## 개요

클래빗 학원 관리 시스템에 **소통 관리 모듈**과 **수업 관리 모듈**이 성공적으로 구축되었습니다.

## 구현된 기능

### 1. 소통 관리 모듈

#### 1.1 공지사항 (Announcements)
- **기능**:
  - 공지사항 작성, 수정, 삭제
  - 우선순위 설정 (긴급, 높음, 보통)
  - 대상 지정 (전체, 학생, 선생님, 학부모, 맞춤)
  - 상단 고정 기능
  - 첨부파일 지원
  - 조회수 및 읽음 상태 추적

- **API 엔드포인트**:
  - `GET /api/announcements` - 공지사항 목록
  - `GET /api/announcements/:id` - 상세 조회
  - `POST /api/announcements` - 생성
  - `PUT /api/announcements/:id` - 수정
  - `DELETE /api/announcements/:id` - 삭제
  - `GET /api/announcements/stats` - 통계

#### 1.2 메시지 (Messages)
- **기능**:
  - 실시간 1:1 메시징
  - 대화방 생성 및 관리
  - 파일 첨부 및 전송
  - 읽음/읽지 않음 상태
  - 타이핑 인디케이터
  - WebSocket 기반 실시간 통신

- **API 엔드포인트**:
  - `GET /api/messages/conversations` - 대화방 목록
  - `GET /api/messages/conversations/:id` - 메시지 조회
  - `POST /api/messages/conversations/:id/messages` - 메시지 전송
  - `GET /api/messages/student/:studentId` - 학생 대화방
  - `GET /api/messages/unread-count` - 읽지 않은 메시지 수

#### 1.3 알림 (Notifications)
- **기능**:
  - 시스템 알림 관리
  - 알림 타입별 분류 (공지, 메시지, 일정, 결제, 출석)
  - 읽음 처리
  - 알림 삭제
  - 타입별 알림 개수 통계

- **API 엔드포인트**:
  - `GET /api/notifications` - 알림 목록
  - `PUT /api/notifications/:id/read` - 읽음 처리
  - `PUT /api/notifications/read-all` - 전체 읽음
  - `GET /api/notifications/unread-count` - 읽지 않은 개수
  - `GET /api/notifications/summary` - 요약

### 2. 수업 관리 모듈

#### 2.1 수업 일정 (Class Schedules)
- **기능**:
  - 수업 일정 생성, 수정, 삭제
  - 반복 일정 생성 (매일, 매주)
  - 일정 충돌 체크
  - 학생 등록 및 관리
  - 출석 체크
  - 상태 관리 (예정, 진행중, 완료, 취소)
  - 오늘의 수업 조회
  - 수업 통계

- **API 엔드포인트**:
  - `GET /api/class-schedules` - 일정 목록
  - `GET /api/class-schedules/:id` - 상세 조회
  - `POST /api/class-schedules` - 생성
  - `PUT /api/class-schedules/:id` - 수정
  - `DELETE /api/class-schedules/:id` - 삭제
  - `POST /api/class-schedules/:id/students` - 학생 추가
  - `PUT /api/class-schedules/:id/attendance` - 출석 체크
  - `GET /api/class-schedules/today` - 오늘의 수업
  - `GET /api/class-schedules/stats` - 통계

#### 2.2 수업 자료 (Class Materials)
- **기능**:
  - 수업 자료 업로드 및 관리
  - 자료 타입별 분류 (문서, 비디오, 오디오, 링크)
  - 공개/비공개 설정
  - 다운로드 수 추적
  - 외부 링크 지원

- **API 엔드포인트**:
  - `GET /api/class-materials` - 자료 목록
  - `GET /api/class-materials/:id` - 상세 조회
  - `POST /api/class-materials` - 생성
  - `PUT /api/class-materials/:id` - 수정
  - `DELETE /api/class-materials/:id` - 삭제
  - `GET /api/class-materials/:id/download` - 다운로드

#### 2.3 수업 과제 (Class Assignments)
- **기능**:
  - 과제 생성, 수정, 삭제
  - 과제 제출 및 관리
  - 첨부파일 지원
  - 채점 및 피드백
  - 마감일 관리
  - 제출 상태 추적 (제출, 지각, 채점완료)
  - 미제출 과제 조회

- **API 엔드포인트**:
  - `GET /api/class-assignments` - 과제 목록
  - `GET /api/class-assignments/:id` - 상세 조회
  - `POST /api/class-assignments` - 생성
  - `PUT /api/class-assignments/:id` - 수정
  - `DELETE /api/class-assignments/:id` - 삭제
  - `POST /api/class-assignments/:id/submit` - 과제 제출
  - `PUT /api/class-assignments/:id/submissions/:submissionId/grade` - 채점
  - `GET /api/class-assignments/pending` - 미제출 과제

## 데이터베이스 스키마

### 주요 테이블

#### 소통 관리
1. **announcements** - 공지사항
2. **announcement_attachments** - 공지사항 첨부파일
3. **announcement_reads** - 공지사항 읽음 상태
4. **message_conversations** - 메시지 대화방
5. **conversation_participants** - 대화방 참여자
6. **messages** - 메시지
7. **message_attachments** - 메시지 첨부파일
8. **notifications** - 알림

#### 수업 관리
1. **class_schedules** - 수업 일정
2. **class_schedule_students** - 수업 참여 학생
3. **class_materials** - 수업 자료
4. **class_assignments** - 수업 과제
5. **assignment_submissions** - 과제 제출
6. **assignment_submission_files** - 과제 제출 첨부파일
7. **class_notes** - 수업 메모
8. **video_class_sessions** - 화상 수업 세션
9. **video_session_participants** - 화상 수업 참여자

## 설치 및 설정

### 1. 데이터베이스 스키마 생성

```bash
# MySQL 접속
mysql -u [username] -p [database_name]

# 스키마 실행
source database/communications-schema.sql
```

또는

```bash
mysql -u [username] -p [database_name] < database/communications-schema.sql
```

### 2. 필요한 패키지 확인

모든 필요한 패키지는 이미 `package.json`에 포함되어 있습니다:
- `express-fileupload` - 파일 업로드
- `socket.io` - WebSocket 실시간 통신
- `multer` - 대체 파일 업로드 (필요시)

### 3. 환경 변수 설정

`.env` 파일에 다음 설정이 있는지 확인:

```env
# 파일 업로드 설정
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760

# WebSocket 설정
CLIENT_URL=http://localhost:3000

# 기타 기존 설정들...
```

### 4. 서버 시작

```bash
npm start
```

## 파일 구조

```
clabbit/
├── database/
│   └── communications-schema.sql         # 데이터베이스 스키마
├── src/
│   ├── models/                           # 데이터 모델
│   │   ├── announcement.model.js
│   │   ├── message.model.js
│   │   ├── notification.model.js
│   │   ├── class-schedule.model.js
│   │   ├── class-material.model.js
│   │   └── class-assignment.model.js
│   ├── controllers/                      # 컨트롤러
│   │   ├── announcements.controller.js
│   │   ├── messages.controller.js
│   │   ├── notifications.controller.js
│   │   ├── class-schedules.controller.js
│   │   ├── class-materials.controller.js
│   │   └── class-assignments.controller.js
│   ├── services/                         # 비즈니스 로직
│   │   ├── communication.service.js
│   │   └── class-schedule.service.js
│   └── routes/                           # 라우트
│       ├── announcements.routes.js
│       ├── messages.routes.js
│       ├── notifications.routes.js
│       ├── class-schedules.routes.js
│       ├── class-materials.routes.js
│       └── class-assignments.routes.js
├── views/                                # 프론트엔드 뷰
│   ├── communications/
│   │   ├── announcements.ejs
│   │   └── messages.ejs
│   └── class-management/
│       └── schedules.ejs
└── public/
    ├── css/
    │   ├── communications.css
    │   └── class-management.css
    └── js/
        ├── communications/
        │   ├── announcements.js
        │   └── messages.js (생성 필요)
        └── class-management/
            ├── schedules.js (생성 필요)
            ├── materials.js (생성 필요)
            └── assignments.js (생성 필요)
```

## WebSocket 실시간 통신

### 이벤트 목록

#### 클라이언트 → 서버
- `consultation:message` - 메시지 전송
- `consultation:typing` - 타이핑 상태 알림
- `consultation:markAsRead` - 메시지 읽음 처리
- `consultation:joinConversation` - 대화방 참가
- `consultation:leaveConversation` - 대화방 나가기

#### 서버 → 클라이언트
- `consultation:newMessage` - 새 메시지 알림
- `consultation:messageSent` - 메시지 전송 확인
- `consultation:typingStatus` - 타이핑 상태 업데이트
- `consultation:messagesRead` - 메시지 읽음 알림
- `user:statusUpdate` - 사용자 온라인 상태 변경
- `notification` - 새 알림
- `system:alert` - 시스템 알림

### 사용 예시

```javascript
// Socket.IO 클라이언트 연결
const socket = io();

// 대화방 참가
socket.emit('consultation:joinConversation', {
    conversationId: 123
});

// 메시지 전송
socket.emit('consultation:message', {
    conversationId: 123,
    recipientId: 456,
    message: '안녕하세요!',
    attachments: []
});

// 새 메시지 수신
socket.on('consultation:newMessage', (data) => {
    console.log('새 메시지:', data);
    // UI 업데이트
});
```

## 주요 기능 사용 가이드

### 1. 공지사항 작성

```javascript
// FormData 생성
const formData = new FormData();
formData.append('title', '중요 공지');
formData.append('content', '내용...');
formData.append('priority', 'urgent');
formData.append('target_type', 'all');
formData.append('is_pinned', true);

// 첨부파일 추가
const files = document.getElementById('files').files;
for (let file of files) {
    formData.append('attachments', file);
}

// API 호출
const response = await fetch('/api/announcements', {
    method: 'POST',
    body: formData
});
```

### 2. 반복 일정 생성

```javascript
const scheduleData = {
    class_id: 1,
    teacher_id: 5,
    subject: '수학',
    title: '정규 수학 수업',
    schedule_date: '2025-01-01',
    start_time: '10:00',
    end_time: '11:30',
    is_recurring: true,
    recurring_pattern: {
        type: 'weekly',
        days: [1, 3, 5], // 월, 수, 금
        interval: 1
    },
    recurring_end_date: '2025-06-30'
};

const response = await fetch('/api/class-schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData)
});
```

### 3. 출석 체크

```javascript
const attendanceData = [
    { student_id: 1, status: 'present', notes: '' },
    { student_id: 2, status: 'absent', notes: '병결' },
    { student_id: 3, status: 'late', notes: '10분 지각' }
];

const response = await fetch(`/api/class-schedules/${scheduleId}/attendance`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ attendance_data: attendanceData })
});
```

## 보안 고려사항

### 1. 멀티테넌시 데이터 격리
모든 API는 `requireAuth`와 `requireAcademy` 미들웨어를 통해 보호됩니다:
- 사용자 인증 확인
- 학원 ID 검증
- 모든 쿼리에 `academy_id` 필터 자동 적용

### 2. 파일 업로드 보안
- 파일 크기 제한: 10MB
- 허용된 파일 타입 검증 권장
- 파일명 sanitization
- 업로드 디렉토리 권한 설정

### 3. WebSocket 인증
- 세션 미들웨어를 통한 인증
- 학원 ID 검증
- 사용자별 룸 격리

## 성능 최적화

### 1. 데이터베이스 인덱스
스키마에 다음 인덱스가 포함되어 있습니다:
- `academy_id` - 학원별 쿼리 최적화
- `created_at`, `published_at` - 시간순 정렬 최적화
- 복합 인덱스 - 자주 사용되는 쿼리 조합

### 2. 페이지네이션
모든 목록 API는 페이지네이션을 지원합니다:
- 기본값: 20개/페이지
- 최대값: 100개/페이지

### 3. WebSocket 연결 관리
- 연결된 사용자 Map 캐싱
- 룸 기반 메시지 전송
- 자동 연결 해제 처리

## 향후 개선 사항

### 1. 프론트엔드 JavaScript 완성
아래 파일들을 추가로 구현해야 합니다:
- `public/js/communications/messages.js`
- `public/js/class-management/schedules.js`
- `public/js/class-management/materials.js`
- `public/js/class-management/assignments.js`

### 2. 추가 기능
- 화상 수업 기능 활성화
- 수업 메모 UI
- 과제 자동 채점
- 통계 차트 시각화
- 모바일 앱 연동

### 3. 알림 시스템 개선
- 이메일 알림
- SMS 알림
- 푸시 알림 (PWA)

## 문제 해결

### 1. 파일 업로드 오류
```bash
# uploads 디렉토리 권한 확인
chmod 755 uploads/
mkdir -p uploads/temp
mkdir -p uploads/announcements
mkdir -p uploads/messages
mkdir -p uploads/materials
mkdir -p uploads/assignments
```

### 2. WebSocket 연결 실패
```javascript
// CORS 설정 확인
// src/config/websocket.js
cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}
```

### 3. 데이터베이스 마이그레이션
기존 데이터와 충돌 시:
```sql
-- 테이블 삭제 후 재생성
DROP TABLE IF EXISTS video_session_participants;
DROP TABLE IF EXISTS video_class_sessions;
-- ... 기타 테이블들
```

## 참고 자료

- [클래빗 프로젝트 가이드](C:\Users\hoonj\project\clabbit\clabbit\CLAUDE.md)
- [Socket.IO 문서](https://socket.io/docs/v4/)
- [Express 파일 업로드](https://www.npmjs.com/package/express-fileupload)

## 지원

문제가 발생하거나 질문이 있으시면 다음을 확인하세요:
1. 데이터베이스 스키마가 올바르게 생성되었는지 확인
2. 환경 변수 설정 확인
3. 서버 로그 확인
4. 브라우저 콘솔 에러 확인

---

**구현 완료일**: 2025-01-09
**버전**: 1.0.0
