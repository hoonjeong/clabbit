// 전역 변수
let currentExamId = null;
let examsData = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadExams();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 시험 추가 버튼
    document.getElementById('btnAddExam').addEventListener('click', function() {
        openAddModal();
    });

    // 검색 버튼
    document.getElementById('btnSearch').addEventListener('click', function() {
        loadExams();
    });

    // 필터 변경 시 자동 검색
    ['filterType', 'filterGrade', 'filterSubject'].forEach(id => {
        document.getElementById(id).addEventListener('change', loadExams);
    });

    // 모달 닫기
    document.querySelector('.modal .close').addEventListener('click', closeModal);

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('examModal');
        if (event.target == modal) {
            closeModal();
        }
    });

    // 폼 제출 방지
    document.getElementById('examForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveExam();
    });
}

// 시험 목록 로드
async function loadExams() {
    try {
        const filters = {
            exam_type: document.getElementById('filterType').value,
            grade_level: document.getElementById('filterGrade').value,
            subject: document.getElementById('filterSubject').value,
            from_date: document.getElementById('filterFromDate').value,
            to_date: document.getElementById('filterToDate').value
        };

        const queryString = Object.entries(filters)
            .filter(([key, value]) => value)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');

        const response = await fetch(`/api/performance/exams?${queryString}`);
        const result = await response.json();

        if (result.success) {
            examsData = result.data;
            renderExams(result.data);
        } else {
            alert('시험 목록을 불러오는데 실패했습니다.');
        }
    } catch (error) {
        console.error('시험 목록 로드 오류:', error);
        alert('시험 목록을 불러오는데 실패했습니다.');
    }
}

// 시험 목록 렌더링
function renderExams(exams) {
    const tbody = document.getElementById('examsList');

    if (!exams || exams.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">등록된 시험이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = exams.map(exam => `
        <tr>
            <td>${exam.exam_name}</td>
            <td><span class="badge badge-${getTypeClass(exam.exam_type)}">${exam.exam_type}</span></td>
            <td>${formatDate(exam.exam_date)}</td>
            <td>${exam.grade_level || '-'}</td>
            <td>${exam.subject || '-'}</td>
            <td>${exam.total_score}점</td>
            <td>${exam.student_count || 0}명</td>
            <td>${exam.avg_score ? exam.avg_score.toFixed(1) + '점' : '-'}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-info" onclick="viewExam(${exam.id})" title="상세">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editExam(${exam.id})" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-success" onclick="manageQuestions(${exam.id})" title="문항 관리">
                        <i class="fas fa-list-ol"></i>
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="inputScores(${exam.id})" title="성적 입력">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteExam(${exam.id})" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 시험 추가 모달 열기
function openAddModal() {
    currentExamId = null;
    document.getElementById('modalTitle').textContent = '시험 추가';
    document.getElementById('examForm').reset();
    document.getElementById('examModal').style.display = 'block';
}

// 시험 수정 모달 열기
async function editExam(examId) {
    try {
        const response = await fetch(`/api/performance/exams/${examId}`);
        const result = await response.json();

        if (result.success) {
            currentExamId = examId;
            document.getElementById('modalTitle').textContent = '시험 수정';

            // 폼 필드 채우기
            const exam = result.data;
            document.getElementById('exam_name').value = exam.exam_name;
            document.getElementById('exam_type').value = exam.exam_type;
            document.getElementById('exam_date').value = exam.exam_date.split('T')[0];
            document.getElementById('grade_level').value = exam.grade_level || '';
            document.getElementById('subject').value = exam.subject || '';
            document.getElementById('total_score').value = exam.total_score;
            document.getElementById('description').value = exam.description || '';

            document.getElementById('examModal').style.display = 'block';
        }
    } catch (error) {
        console.error('시험 정보 로드 오류:', error);
        alert('시험 정보를 불러오는데 실패했습니다.');
    }
}

// 시험 저장
async function saveExam() {
    const formData = new FormData(document.getElementById('examForm'));
    const data = Object.fromEntries(formData.entries());

    // 빈 문자열을 null로 변환
    Object.keys(data).forEach(key => {
        if (data[key] === '') {
            data[key] = null;
        }
    });

    try {
        const url = currentExamId
            ? `/api/performance/exams/${currentExamId}`
            : '/api/performance/exams';

        const method = currentExamId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            alert(currentExamId ? '시험이 수정되었습니다.' : '시험이 추가되었습니다.');
            closeModal();
            loadExams();
        } else {
            alert(result.error || '저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('시험 저장 오류:', error);
        alert('저장에 실패했습니다.');
    }
}

// 시험 삭제
async function deleteExam(examId) {
    if (!confirm('정말로 이 시험을 삭제하시겠습니까?\n관련된 모든 성적 데이터도 함께 삭제됩니다.')) {
        return;
    }

    try {
        const response = await fetch(`/api/performance/exams/${examId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert('시험이 삭제되었습니다.');
            loadExams();
        } else {
            alert(result.error || '삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('시험 삭제 오류:', error);
        alert('삭제에 실패했습니다.');
    }
}

// 시험 상세 보기
function viewExam(examId) {
    window.location.href = `/performance/exams/${examId}`;
}

// 문항 관리
function manageQuestions(examId) {
    window.location.href = `/performance/exams/${examId}/questions`;
}

// 성적 입력
function inputScores(examId) {
    window.location.href = `/performance/scores/input?exam_id=${examId}`;
}

// 모달 닫기
function closeModal() {
    document.getElementById('examModal').style.display = 'none';
    document.getElementById('examForm').reset();
    currentExamId = null;
}

// 유틸리티 함수들
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function getTypeClass(type) {
    const classes = {
        '내신': 'primary',
        '모의고사': 'success',
        '단어시험': 'info',
        '기타': 'secondary'
    };
    return classes[type] || 'secondary';
}