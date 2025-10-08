/**
 * 수업 목록 관리 스크립트
 * 수업 조회, 검색, 필터링, 정렬 기능
 */

let currentPage = 1;
let currentFilters = {
    search: '',
    status: '',
    grade: '',
    sortBy: 'created_at',
    sortOrder: 'DESC'
};

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    loadClasses();
    loadGrades();
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 검색 버튼
    document.getElementById('searchBtn').addEventListener('click', function() {
        currentPage = 1;
        currentFilters.search = document.getElementById('searchInput').value;
        currentFilters.status = document.getElementById('statusFilter').value;
        currentFilters.grade = document.getElementById('gradeFilter').value;
        loadClasses();
    });

    // 엔터키로 검색
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('searchBtn').click();
        }
    });

    // 정렬 헤더 클릭
    document.querySelectorAll('.sortable').forEach(th => {
        th.addEventListener('click', function() {
            const sortBy = this.dataset.sort;
            if (currentFilters.sortBy === sortBy) {
                currentFilters.sortOrder = currentFilters.sortOrder === 'ASC' ? 'DESC' : 'ASC';
            } else {
                currentFilters.sortBy = sortBy;
                currentFilters.sortOrder = 'ASC';
            }
            loadClasses();
        });
    });
}

// 학년 목록 로드
async function loadGrades() {
    try {
        const data = await APIClient.get(CONSTANTS.API.CLASSES.GRADES);

        if (data.success && data.grades) {
            const gradeFilter = document.getElementById('gradeFilter');
            data.grades.forEach(grade => {
                const option = document.createElement('option');
                option.value = grade;
                option.textContent = grade;
                gradeFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('학년 목록 로드 오류:', error);
    }
}

// 수업 목록 로드
async function loadClasses() {
    try {
        const params = {
            page: currentPage,
            limit: 20,
            ...currentFilters
        };

        const data = await APIClient.get(CONSTANTS.API.CLASSES.LIST, params);

        if (data.success) {
            displayClasses(data.classes);
            displayPagination(data.pagination);
        } else {
            alert(data.error || '수업 목록을 불러오는데 실패했습니다.');
        }
    } catch (error) {
        ErrorHandler.handle(error, '수업 목록을 불러오는 중 오류가 발생했습니다.');
    }
}

// 수업 목록 표시
function displayClasses(classes) {
    const tbody = document.getElementById('classTableBody');

    if (classes.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 60px; text-align: center; color: #999;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📚</div>
                    <p style="font-size: 16px; margin-bottom: 8px;">검색 결과가 없습니다</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = classes.map(cls => {
        const statusBadge = cls.status === 'active'
            ? '<span class="badge badge-success">진행중</span>'
            : '<span class="badge badge-secondary">종강</span>';

        const capacityColor = cls.current_students >= cls.max_students ? '#e74c3c' : '#27ae60';

        return `
            <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 16px;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">${cls.class_name}</div>
                    <div style="font-size: 13px; color: #999;">${cls.subject || '-'} ${cls.grade ? '| ' + cls.grade : ''}</div>
                </td>
                <td style="padding: 16px; text-align: center;">
                    <span style="color: ${capacityColor}; font-weight: 600;">
                        ${cls.current_students || 0}/${cls.max_students || 0}
                    </span>
                </td>
                <td style="padding: 16px; text-align: right; font-weight: 600; color: #333;">
                    ${formatCurrency(cls.tuition || 0)}
                </td>
                <td style="padding: 16px; color: #666; font-size: 14px;">
                    ${cls.class_time || '-'}
                </td>
                <td style="padding: 16px; color: #666;">
                    ${cls.teacher_name || '-'}
                </td>
                <td style="padding: 16px; text-align: center;">
                    ${statusBadge}
                </td>
                <td style="padding: 16px; text-align: center;">
                    <div style="display: flex; gap: 8px; justify-content: center;">
                        <a href="/classes/${cls.id}" class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 13px; text-decoration: none;">상세</a>
                        ${cls.status === 'active' ? `
                            <button onclick="completeClass(${cls.id})" class="btn btn-sm btn-secondary" style="padding: 6px 12px; font-size: 13px;">종강</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 페이지네이션 표시
function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages } = pagination;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '';

    // 이전 버튼
    if (page > 1) {
        html += `<button onclick="goToPage(${page - 1})" class="btn btn-sm" style="padding: 8px 12px;">이전</button>`;
    }

    // 페이지 번호
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);

    if (startPage > 1) {
        html += `<button onclick="goToPage(1)" class="btn btn-sm" style="padding: 8px 12px;">1</button>`;
        if (startPage > 2) {
            html += `<span style="padding: 8px;">...</span>`;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        if (i === page) {
            html += `<button class="btn btn-sm btn-primary" style="padding: 8px 12px;">${i}</button>`;
        } else {
            html += `<button onclick="goToPage(${i})" class="btn btn-sm" style="padding: 8px 12px;">${i}</button>`;
        }
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<span style="padding: 8px;">...</span>`;
        }
        html += `<button onclick="goToPage(${totalPages})" class="btn btn-sm" style="padding: 8px 12px;">${totalPages}</button>`;
    }

    // 다음 버튼
    if (page < totalPages) {
        html += `<button onclick="goToPage(${page + 1})" class="btn btn-sm" style="padding: 8px 12px;">다음</button>`;
    }

    container.innerHTML = html;
}

// 페이지 이동
function goToPage(page) {
    currentPage = page;
    loadClasses();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 수업 종강
async function completeClass(classId) {
    const confirmed = await Modal.confirm(
        '이 수업을 종강 처리하시겠습니까?\\n종강 후에는 다시 진행중으로 변경할 수 없습니다.',
        '수업 종강'
    );

    if (!confirmed) return;

    try {
        const data = await APIClient.put(CONSTANTS.API.CLASSES.COMPLETE(classId));

        if (data.success) {
            alert(data.message || '수업이 종강 처리되었습니다.');
            loadClasses();
        } else {
            alert(data.error || '종강 처리에 실패했습니다.');
        }
    } catch (error) {
        ErrorHandler.handle(error, '종강 처리 중 오류가 발생했습니다.');
    }
}

// 통화 형식 변환
function formatCurrency(amount) {
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW'
    }).format(amount);
}
