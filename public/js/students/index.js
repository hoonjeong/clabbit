// 학생 현황 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const limit = 20;

    // URL에서 type 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const listType = urlParams.get('type');
    const period = urlParams.get('period');

    // 페이지 타이틀 변경
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle) {
        if (listType === 'new' && period === 'this_month') {
            pageTitle.textContent = '📈 이번달 신규 학생';
        } else if (listType === 'exits' && period === 'this_month') {
            pageTitle.textContent = '📉 이번달 퇴원 학생';
        }
    }

    // 학생 목록 로드
    async function loadStudents() {
        const search = document.getElementById('searchInput').value;
        const school = document.getElementById('schoolFilter').value;
        const grade = document.getElementById('gradeFilter').value;

        try {
            let response, result;

            // type이 new 또는 exits인 경우 특별 처리
            if (listType === 'new' && period) {
                // 신규 학생 목록
                response = await fetch(`/api/students/new?period=${period}`);
                result = await response.json();
            } else if (listType === 'exits' && period) {
                // 퇴원 학생 목록
                response = await fetch(`/api/students/exits?period=${period}`);
                result = await response.json();
            } else {
                // 일반 학생 목록
                const params = new URLSearchParams({
                    status: 'active',
                    page: currentPage,
                    limit: limit
                });

                if (search) params.append('search', search);
                if (school) params.append('school', school);
                if (grade) params.append('grade', grade);

                response = await fetch(`/api/students?${params}`);
                result = await response.json();
            }

            if (result.success) {
                // API 응답 구조에 따라 학생 데이터 추출
                const studentsData = result.data ? result.data.students : result.students;
                displayStudents(studentsData);

                // 신규/퇴원 목록의 경우 pagination이 없을 수 있음
                if (result.data && result.data.pagination) {
                    updatePagination(result.data.pagination);
                    document.getElementById('totalCount').textContent = result.data.pagination.total;
                } else if (result.data && result.data.count !== undefined) {
                    document.getElementById('totalCount').textContent = result.data.count;
                    // pagination 숨기기
                    const paginationEl = document.getElementById('pagination');
                    if (paginationEl) paginationEl.style.display = 'none';
                } else if (result.pagination) {
                    updatePagination(result.pagination);
                    document.getElementById('totalCount').textContent = result.pagination.total;
                }
            } else {
                console.error('API 요청 실패:', result.error);
            }
        } catch (error) {
            console.error('학생 목록 로드 오류:', error);
        }
    }

    // 학생 목록 표시
    function displayStudents(students) {
        const tableBody = document.getElementById('studentsTableBody');
        const emptyState = document.getElementById('emptyState');

        if (students.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        tableBody.innerHTML = students.map(student => {
            // 날짜 형식 변환 (YYYY-MM-DD만 추출)
            const enrollmentDate = student.enrollment_date ? student.enrollment_date.split('T')[0] : '-';

            return `
            <tr>
                <td onclick="location.href='/students/${student.id}'" style="cursor: pointer;"><strong>${student.name}</strong></td>
                <td onclick="location.href='/students/${student.id}'" style="cursor: pointer;">${student.school || '-'}</td>
                <td onclick="location.href='/students/${student.id}'" style="cursor: pointer;">${student.grade || '-'}</td>
                <td onclick="location.href='/students/${student.id}'" style="cursor: pointer;">${student.student_phone || '-'}</td>
                <td onclick="location.href='/students/${student.id}'" style="cursor: pointer;">${student.parent_phone}</td>
                <td onclick="location.href='/students/${student.id}'" style="cursor: pointer;">${enrollmentDate}</td>
                <td style="padding: 0.5rem;">
                    <div style="display: flex; gap: 0.5rem; justify-content: center;">
                        <button class="btn-small btn-primary" onclick="event.stopPropagation(); enrollStudent(${student.id})">수업등록</button>
                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); withdrawStudent(${student.id}, '${student.name}')">퇴원</button>
                    </div>
                </td>
            </tr>
        `;
        }).join('');
    }

    // 페이지네이션 업데이트
    function updatePagination(pagination) {
        const paginationDiv = document.getElementById('pagination');

        if (pagination.totalPages <= 1) {
            paginationDiv.style.display = 'none';
            return;
        }

        paginationDiv.style.display = 'flex';

        let html = '';

        // 이전 버튼
        html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">이전</button>`;

        // 페이지 번호
        for (let i = 1; i <= pagination.totalPages; i++) {
            if (i === 1 || i === pagination.totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                html += `<span>...</span>`;
            }
        }

        // 다음 버튼
        html += `<button class="page-btn" ${currentPage === pagination.totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">다음</button>`;

        paginationDiv.innerHTML = html;
    }

    // 페이지 변경
    window.changePage = function(page) {
        currentPage = page;
        loadStudents();
    };

    // 검색
    document.getElementById('searchInput').addEventListener('input', function() {
        currentPage = 1;
        loadStudents();
    });

    // 필터
    document.getElementById('schoolFilter').addEventListener('change', function() {
        currentPage = 1;
        loadStudents();
    });

    document.getElementById('gradeFilter').addEventListener('change', function() {
        currentPage = 1;
        loadStudents();
    });

    // 수업 등록
    window.enrollStudent = function(studentId) {
        window.location.href = `/students/${studentId}/enroll`;
    };

    // 퇴원 처리
    window.withdrawStudent = async function(studentId, studentName) {
        if (!confirm(`'${studentName}' 학생을 퇴원 처리하시겠습니까?\n\n퇴원 처리 시 모든 수강 등록도 함께 종료됩니다.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/students/${studentId}/withdraw`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                alert('퇴원 처리가 완료되었습니다.');
                loadStudents(); // 목록 새로고침
            } else {
                alert(result.message || '퇴원 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error('퇴원 처리 오류:', error);
            alert('퇴원 처리 중 오류가 발생했습니다.');
        }
    };

    // 로그아웃
    document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('로그아웃 하시겠습니까?')) {
            window.location.href = '/login';
        }
    });

    // 초기 로드
    loadStudents();
});
