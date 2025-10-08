// 전역 변수
let currentConsultationId = null;
let consultationsData = [];
let categoriesData = [];
let studentsData = [];

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadInitialData();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 상담 추가 버튼
    document.getElementById('btnAddConsultation').addEventListener('click', function() {
        openAddModal();
    });

    // 검색 버튼
    document.getElementById('btnSearch').addEventListener('click', function() {
        loadConsultations();
    });

    // 모달 닫기
    document.querySelector('.modal .close').addEventListener('click', closeModal);

    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('consultationModal');
        if (event.target == modal) {
            closeModal();
        }
    });

    // 추가 상담 체크박스 변경 시
    document.getElementById('follow_up_required').addEventListener('change', function() {
        const followUpDate = document.getElementById('follow_up_date');
        followUpDate.disabled = !this.checked;
        if (!this.checked) {
            followUpDate.value = '';
        }
    });
}

// 초기 데이터 로드
async function loadInitialData() {
    await Promise.all([
        loadCategories(),
        loadStudents(),
        loadConsultations()
    ]);
}

// 상담 분류 로드
async function loadCategories() {
    try {
        const response = await fetch('/api/consultation/categories');
        const result = await response.json();

        if (result.success) {
            categoriesData = result.data;

            // 필터 드롭다운 채우기
            const filterSelect = document.getElementById('filterCategory');
            const formSelect = document.getElementById('category_id');

            filterSelect.innerHTML = '<option value="">전체</option>';
            formSelect.innerHTML = '<option value="">선택하세요</option>';

            categoriesData.forEach(cat => {
                const option = `<option value="${cat.id}">${cat.category_name}</option>`;
                filterSelect.innerHTML += option;
                formSelect.innerHTML += option;
            });
        }
    } catch (error) {
        console.error('상담 분류 로드 오류:', error);
    }
}

// 학생 목록 로드
async function loadStudents() {
    try {
        const response = await fetch('/api/students?status=active');
        const result = await response.json();

        if (result.success && result.students) {
            studentsData = result.students;

            const select = document.getElementById('student_id');
            select.innerHTML = '<option value="">학생을 선택하세요</option>';

            studentsData.forEach(student => {
                select.innerHTML += `<option value="${student.id}">${student.name} (${student.grade}, ${student.school})</option>`;
            });
        }
    } catch (error) {
        console.error('학생 목록 로드 오류:', error);
    }
}

// 상담 목록 로드
async function loadConsultations() {
    try {
        const filters = {
            category_id: document.getElementById('filterCategory').value,
            consultant_id: document.getElementById('filterConsultant').value,
            from_date: document.getElementById('filterFromDate').value,
            to_date: document.getElementById('filterToDate').value,
            is_important: document.getElementById('filterImportant').checked ? 'true' : '',
            follow_up_required: document.getElementById('filterFollowUp').checked ? 'true' : ''
        };

        const queryString = Object.entries(filters)
            .filter(([key, value]) => value)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');

        const response = await fetch(`/api/consultation/records?${queryString}`);
        const result = await response.json();

        if (result.success) {
            consultationsData = result.data;
            renderConsultations(result.data);
        }
    } catch (error) {
        console.error('상담 목록 로드 오류:', error);
    }
}

// 상담 목록 렌더링
function renderConsultations(consultations) {
    const tbody = document.getElementById('consultationsList');

    if (!consultations || consultations.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center">등록된 상담 기록이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = consultations.map(consultation => `
        <tr>
            <td>
                ${consultation.is_important ? '<i class="fas fa-star text-warning"></i>' : ''}
            </td>
            <td>${formatDate(consultation.consultation_date)}</td>
            <td>${consultation.student_name}</td>
            <td>${consultation.student_grade}</td>
            <td>
                <span class="badge" style="background-color: ${consultation.category_color || '#6c757d'}">
                    ${consultation.category_name}
                </span>
            </td>
            <td>${consultation.consultant_name}</td>
            <td>${consultation.consultation_method}</td>
            <td>
                <span class="status-badge status-${consultation.status}">
                    ${getStatusText(consultation.status)}
                </span>
            </td>
            <td>
                ${consultation.follow_up_required ?
                    `<span class="text-danger">필요<br>(${formatDate(consultation.follow_up_date)})</span>` :
                    '-'}
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-info" onclick="viewConsultation(${consultation.id})" title="상세">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-warning" onclick="editConsultation(${consultation.id})" title="수정">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm ${consultation.is_important ? 'btn-warning' : 'btn-secondary'}"
                            onclick="toggleImportant(${consultation.id})" title="중요 표시">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteConsultation(${consultation.id})" title="삭제">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 상담 추가 모달 열기
function openAddModal() {
    currentConsultationId = null;
    document.getElementById('modalTitle').textContent = '상담 추가';
    document.getElementById('consultationForm').reset();
    document.getElementById('follow_up_date').disabled = true;

    // 오늘 날짜로 설정
    document.getElementById('consultation_date').value = new Date().toISOString().split('T')[0];

    document.getElementById('consultationModal').style.display = 'block';
}

// 상담 수정 모달 열기
async function editConsultation(consultationId) {
    try {
        const response = await fetch(`/api/consultation/records/${consultationId}`);
        const result = await response.json();

        if (result.success) {
            currentConsultationId = consultationId;
            document.getElementById('modalTitle').textContent = '상담 수정';

            const consultation = result.data;
            document.getElementById('student_id').value = consultation.student_id;
            document.getElementById('category_id').value = consultation.category_id;
            document.getElementById('consultation_date').value = consultation.consultation_date.split('T')[0];
            document.getElementById('consultation_time').value = consultation.consultation_time || '';
            document.getElementById('consultation_method').value = consultation.consultation_method;
            document.getElementById('consultation_purpose').value = consultation.consultation_purpose || '';
            document.getElementById('consultation_content').value = consultation.consultation_content;
            document.getElementById('consultation_result').value = consultation.consultation_result || '';
            document.getElementById('parent_feedback').value = consultation.parent_feedback || '';
            document.getElementById('follow_up_required').checked = consultation.follow_up_required;
            document.getElementById('follow_up_date').value = consultation.follow_up_date ? consultation.follow_up_date.split('T')[0] : '';
            document.getElementById('follow_up_date').disabled = !consultation.follow_up_required;
            document.getElementById('is_important').checked = consultation.is_important;

            document.getElementById('consultationModal').style.display = 'block';
        }
    } catch (error) {
        console.error('상담 정보 로드 오류:', error);
        alert('상담 정보를 불러오는데 실패했습니다.');
    }
}

// 상담 저장
async function saveConsultation() {
    const formData = new FormData(document.getElementById('consultationForm'));
    const data = {};

    // FormData를 객체로 변환
    formData.forEach((value, key) => {
        if (key === 'follow_up_required' || key === 'is_important') {
            data[key] = document.getElementById(key).checked;
        } else {
            data[key] = value || null;
        }
    });

    // follow_up_required가 false인 경우 follow_up_date를 null로
    if (!data.follow_up_required) {
        data.follow_up_date = null;
    }

    try {
        const url = currentConsultationId
            ? `/api/consultation/records/${currentConsultationId}`
            : '/api/consultation/records';

        const method = currentConsultationId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            alert(currentConsultationId ? '상담 기록이 수정되었습니다.' : '상담 기록이 추가되었습니다.');
            closeModal();
            loadConsultations();
        } else {
            alert(result.error || '저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('상담 저장 오류:', error);
        alert('저장에 실패했습니다.');
    }
}

// 상담 삭제
async function deleteConsultation(consultationId) {
    if (!confirm('정말로 이 상담 기록을 삭제하시겠습니까?')) {
        return;
    }

    try {
        const response = await fetch(`/api/consultation/records/${consultationId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert('상담 기록이 삭제되었습니다.');
            loadConsultations();
        } else {
            alert(result.error || '삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('상담 삭제 오류:', error);
        alert('삭제에 실패했습니다.');
    }
}

// 중요 표시 토글
async function toggleImportant(consultationId) {
    try {
        const response = await fetch(`/api/consultation/records/${consultationId}/important`, {
            method: 'PUT'
        });

        const result = await response.json();

        if (result.success) {
            loadConsultations();
        }
    } catch (error) {
        console.error('중요 표시 변경 오류:', error);
    }
}

// 상담 상세 보기
function viewConsultation(consultationId) {
    window.location.href = `/consultation/records/${consultationId}`;
}

// 모달 닫기
function closeModal() {
    document.getElementById('consultationModal').style.display = 'none';
    document.getElementById('consultationForm').reset();
    currentConsultationId = null;
}

// 유틸리티 함수들
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR');
}

function getStatusText(status) {
    const statusMap = {
        'scheduled': '예정',
        'completed': '완료',
        'cancelled': '취소'
    };
    return statusMap[status] || status;
}