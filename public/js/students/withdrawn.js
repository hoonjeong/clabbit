// 퇴원생 관리 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const limit = 20;

    // 퇴원생 목록 로드
    async function loadWithdrawnStudents() {
        const search = document.getElementById('searchInput').value;
        const school = document.getElementById('schoolFilter').value;
        const grade = document.getElementById('gradeFilter').value;

        try {
            const params = new URLSearchParams({
                status: 'withdrawn',
                page: currentPage,
                limit: limit
            });

            if (search) params.append('search', search);
            if (school) params.append('school', school);
            if (grade) params.append('grade', grade);

            const response = await fetch(`/api/students?${params}`);
            const result = await response.json();

            if (result.success) {
                displayStudents(result.students);
                updatePagination(result.pagination);
                document.getElementById('totalCount').textContent = result.pagination.total;
            }
        } catch (error) {
            console.error('퇴원생 목록 로드 오류:', error);
        }
    }

    // 퇴원생 목록 표시
    function displayStudents(students) {
        const tableBody = document.getElementById('studentsTableBody');
        const emptyState = document.getElementById('emptyState');

        if (students.length === 0) {
            tableBody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';

        tableBody.innerHTML = students.map(student => `
            <tr>
                <td><strong>${student.name}</strong></td>
                <td>${student.school || '-'}</td>
                <td>${student.grade || '-'}</td>
                <td>${student.parent_phone}</td>
                <td>${student.enrollment_date}</td>
                <td>${student.withdrawal_date || '-'}</td>
                <td>
                    <button class="action-btn reinstate-btn" data-id="${student.id}" data-name="${student.name}">
                        재원 처리
                    </button>
                    <button class="action-btn view-btn" onclick="location.href='/students/${student.id}'">
                        상세보기
                    </button>
                </td>
            </tr>
        `).join('');

        // 재원 처리 버튼 이벤트 추가
        document.querySelectorAll('.reinstate-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const studentId = this.dataset.id;
                const studentName = this.dataset.name;
                reinstateStudent(studentId, studentName);
            });
        });
    }

    // 재원 처리
    async function reinstateStudent(studentId, studentName) {
        if (!confirm(`${studentName} 학생을 재원 처리하시겠습니까?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/students/${studentId}/reinstate`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                alert('재원 처리가 완료되었습니다.');
                loadWithdrawnStudents(); // 목록 새로고침
            } else {
                alert(result.message || '재원 처리에 실패했습니다.');
            }
        } catch (error) {
            console.error('재원 처리 오류:', error);
            alert('서버 오류가 발생했습니다.');
        }
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
        loadWithdrawnStudents();
    };

    // 검색
    document.getElementById('searchInput').addEventListener('input', function() {
        currentPage = 1;
        loadWithdrawnStudents();
    });

    // 필터
    document.getElementById('schoolFilter').addEventListener('change', function() {
        currentPage = 1;
        loadWithdrawnStudents();
    });

    document.getElementById('gradeFilter').addEventListener('change', function() {
        currentPage = 1;
        loadWithdrawnStudents();
    });

    // 로그아웃
    document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('로그아웃 하시겠습니까?')) {
            window.location.href = '/login';
        }
    });

    // 초기 로드
    loadWithdrawnStudents();
});
