# 학생-수강반 연동 시스템 구축 진행 상황

## ✅ 완료된 작업 (백엔드)

### 1. 데이터베이스 구축
- ✅ `enrollments` 테이블 생성
  - 학생-수업 연결 중간 테이블
  - 중복 등록 방지 제약조건 (UNIQUE KEY)
  - 외래키 제약조건 (CASCADE 삭제)
  - 성능 최적화 인덱스 추가
- ✅ 마이그레이션 스크립트: `scripts/create-enrollments-table.js`

### 2. Model 계층
- ✅ `src/models/enrollment.model.js` 생성
  - `create()`: 단일 학생 등록
  - `bulkCreate()`: 다중 학생 일괄 등록 (트랜잭션)
  - `findByStudent()`: 학생별 수강 내역 조회
  - `findByClass()`: 수업별 수강생 목록 조회
  - `findAvailableStudents()`: 등록 가능한 학생 목록
  - `updateStatus()`: 수강 상태 변경
  - `withdrawAllByStudent()`: 학생 퇴원 시 모든 수강 withdrawn 처리
  - `findById()`: 등록 상세 조회
  - `delete()`: 등록 삭제

### 3. Controller 계층
- ✅ `src/controllers/enrollments.controller.js` 생성
  - `create()`: POST /api/enrollments
  - `bulkCreate()`: POST /api/enrollments/bulk
  - `getStudentEnrollments()`: GET /api/students/:id/enrollments
  - `getClassEnrollments()`: GET /api/classes/:id/enrollments
  - `getAvailableStudents()`: GET /api/classes/:id/available-students
  - `updateStatus()`: PATCH /api/enrollments/:id/status
  - `delete()`: DELETE /api/enrollments/:id

### 4. Routes 설정
- ✅ `src/routes/enrollments.routes.js` 생성
- ✅ `src/routes/students.routes.js` 수정
  - 학생 수업 등록 페이지 라우트 추가: `/students/:id/enroll`
  - 학생별 수강 내역 API 추가
- ✅ `src/routes/classes.routes.js` 수정
  - 수업별 일괄 등록 페이지 라우트 추가: `/classes/:id/enroll-students`
  - 수업별 수강생 목록 API 추가
  - 등록 가능 학생 목록 API 추가
- ✅ `src/routes/index.js` 수정
  - enrollments 라우트 통합

### 5. 학생 퇴원 기능 업데이트
- ✅ `src/controllers/students.controller.js` 수정
  - 퇴원 시 모든 active 수강 등록도 withdrawn으로 변경

---

## 🔄 다음 단계 (프론트엔드)

### 작업 5: 학생 상세 페이지 수정
**파일**: `views/students/detail.ejs`

**변경사항**:
- [ ] "수정하기" 버튼 앞에 "수업등록" 버튼 추가
- [ ] 버튼 클릭 시 `/students/{student_id}/enroll` 페이지로 이동
- [ ] 현재 수강 중인 수업 목록 표시 (선택사항)

---

### 작업 6: 학생 수업 등록 페이지 생성
**파일**: `views/students/enroll.ejs` (신규)

**구성**:
```
┌─────────────────────────────────────────┐
│ 🎓 수업 등록                             │
├─────────────────────────────────────────┤
│ 학생 정보                                │
│ - 이름: 홍길동                           │
│ - 학년: 중1                              │
├─────────────────────────────────────────┤
│ 수업 선택 [드롭다운 ▼]                   │
│ 시작일 [날짜선택]                        │
│ 첫 달 원비 [        원]                  │
├─────────────────────────────────────────┤
│ [취소] [등록하기]                        │
└─────────────────────────────────────────┘
```

**JavaScript 로직**:
```javascript
// 학생 정보 로드
fetch(`/api/students/${studentId}`)

// 수업 목록 로드 (active 상태만)
fetch('/api/classes?status=active')

// 등록 제출
fetch('/api/enrollments', {
  method: 'POST',
  body: JSON.stringify({
    student_id,
    class_id,
    start_date,
    first_month_fee
  })
})
```

---

### 작업 7: 학생 리스트 페이지 수정
**파일**: `views/students/index.ejs` 또는 관련 JS 파일

**변경사항**:
- [ ] 가입일 표시 형식: `YYYY-MM-DD` (시간 제거)
- [ ] 각 행에 "액션" 컬럼 추가
- [ ] "퇴원" 버튼 추가
  - 클릭 시 확인 다이얼로그
  - `POST /api/students/:id/withdraw`
- [ ] "수업등록" 버튼 추가
  - 클릭 시 `/students/:id/enroll` 이동

**HTML 예시**:
```html
<tr>
  <td>홍길동</td>
  <td>중1</td>
  <td>2024-10-01</td> <!-- YYYY-MM-DD 형식 -->
  <td>
    <button onclick="enrollStudent(${id})">수업등록</button>
    <button onclick="withdrawStudent(${id})">퇴원</button>
  </td>
</tr>
```

---

### 작업 8: 수업별 학생 일괄 등록 페이지 생성
**파일**: `views/classes/enroll-students.ejs` (신규)

**복잡한 UI 구조**:
```
┌─────────────────────────────────────────────────┐
│ 📚 수업: 중등 수학 A반                           │
├─────────────────────────────────────────────────┤
│ ✨ 선택된 학생 (3명)                             │
│ [홍길동 ✕] [김철수 ✕] [이영희 ✕] [전체 해제]   │
├─────────────────────────────────────────────────┤
│ 필터: [학년▼] [검색: ____] [상태▼] [정렬▼]      │
├─────────────────────────────────────────────────┤
│ ☑ 전체선택                                      │
│ ☑ 홍길동   중1   010-1234-5678   재학중          │
│ ☐ 김철수   중2   010-2345-6789   재학중          │
│ ☑ 이영희   중1   010-3456-7890   재학중          │
│ ☑ 박민수   중1   010-4567-8901   재학중          │
│ ☐ 최지우   중3   010-5678-9012   퇴원 (비활성화) │
│ ☐ 정다은   중2   010-6789-0123   이미 등록됨     │
├─────────────────────────────────────────────────┤
│ 시작일 [2024-10-06] 첫달원비 [200,000원]        │
│                    [선택한 3명 일괄 등록]        │
└─────────────────────────────────────────────────┘
```

**주요 기능**:
1. **선택 상태 관리**
   - 체크박스 선택 시 상단 태그 영역에 표시
   - 필터 변경 시에도 선택 유지
   - 태그의 X 버튼으로 개별 해제

2. **필터링/검색**
   - 학년 필터
   - 이름 실시간 검색
   - 상태 필터 (재학/퇴원)

3. **중복 등록 방지**
   - 이미 등록된 학생은 체크박스 비활성화 또는 표시

4. **일괄 등록**
   ```javascript
   fetch('/api/enrollments/bulk', {
     method: 'POST',
     body: JSON.stringify({
       student_ids: [1, 2, 3],
       class_id,
       start_date,
       first_month_fee
     })
   })
   ```

**JavaScript 상태 관리**:
```javascript
let selectedStudents = new Set(); // 선택된 학생 ID
let allStudents = []; // 전체 학생 목록
let filteredStudents = []; // 필터링된 결과

function toggleStudent(studentId) {
  if (selectedStudents.has(studentId)) {
    selectedStudents.delete(studentId);
  } else {
    selectedStudents.add(studentId);
  }
  updateSelectedTags();
}

function applyFilters() {
  filteredStudents = allStudents.filter(/* ... */);
  renderStudentTable();
}

function updateSelectedTags() {
  // 상단 태그 영역 업데이트
}
```

---

## 📝 API 엔드포인트 요약

### Enrollment 관련
| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/enrollments` | 단일 학생 등록 |
| POST | `/api/enrollments/bulk` | 다중 학생 일괄 등록 |
| PATCH | `/api/enrollments/:id/status` | 수강 상태 변경 |
| DELETE | `/api/enrollments/:id` | 수강 등록 삭제 |

### Student 관련
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/students/:id/enrollments` | 학생별 수강 내역 |
| POST | `/api/students/:id/withdraw` | 학생 퇴원 (수강도 함께 처리) |

### Class 관련
| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | `/api/classes/:id/enrollments` | 수업별 수강생 목록 |
| GET | `/api/classes/:id/available-students` | 등록 가능한 학생 목록 |

---

## 🚀 서버 시작 및 테스트

### 서버 재시작
```bash
# 서버가 실행 중이라면 중지 후 재시작
npm start
```

### API 테스트 (Postman 또는 curl)

**1. 단일 학생 등록**:
```bash
curl -X POST http://localhost:3000/api/enrollments \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": 1,
    "class_id": 1,
    "start_date": "2024-10-06",
    "first_month_fee": 200000
  }'
```

**2. 등록 가능한 학생 조회**:
```bash
curl http://localhost:3000/api/classes/1/available-students
```

**3. 일괄 등록**:
```bash
curl -X POST http://localhost:3000/api/enrollments/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "student_ids": [1, 2, 3],
    "class_id": 1,
    "start_date": "2024-10-06",
    "first_month_fee": 200000
  }'
```

---

## 📊 데이터베이스 확인

```sql
-- enrollments 테이블 확인
SELECT * FROM enrollments;

-- 학생별 수강 현황
SELECT
  s.name,
  c.class_name,
  e.start_date,
  e.status
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN classes c ON e.class_id = c.id
WHERE e.status = 'active';

-- 수업별 수강생 수
SELECT
  c.class_name,
  COUNT(e.id) as enrollment_count
FROM classes c
LEFT JOIN enrollments e ON c.id = e.class_id AND e.status = 'active'
GROUP BY c.id;
```

---

## 🎯 다음 작업 우선순위

1. **학생 상세 페이지 수정** (간단)
2. **학생 수업 등록 페이지** (중간)
3. **학생 리스트 페이지 수정** (간단)
4. **수업별 일괄 등록 페이지** (복잡 - 상태 관리, 필터링, 실시간 업데이트)

---

**작업 날짜**: 2024-10-06
**상태**: 백엔드 완료, 프론트엔드 진행 예정
