/**
 * 공지사항 관리 JavaScript
 */

let currentPage = 1;
let currentFilters = {};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    loadAnnouncements();
    initializeEventListeners();
});

// 이벤트 리스너 초기화
function initializeEventListeners() {
    // 공지사항 작성 버튼
    document.getElementById('createAnnouncementBtn').addEventListener('click', () => {
        openAnnouncementModal();
    });

    // 검색 버튼
    document.getElementById('searchBtn').addEventListener('click', () => {
        currentFilters.search = document.getElementById('searchInput').value;
        currentFilters.priority = document.getElementById('priorityFilter').value;
        currentFilters.target_type = document.getElementById('targetFilter').value;
        currentPage = 1;
        loadAnnouncements();
    });

    // 공지사항 저장 버튼
    document.getElementById('saveAnnouncementBtn').addEventListener('click', saveAnnouncement);

    // 모달 닫기
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // 반복 일정 체크박스
    document.getElementById('is_recurring')?.addEventListener('change', function() {
        document.getElementById('recurringOptions').style.display =
            this.checked ? 'block' : 'none';
    });
}

// 공지사항 목록 로드
async function loadAnnouncements() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            limit: 20,
            ...currentFilters
        });

        const response = await fetch(`/api/announcements?${params}`);
        const data = await response.json();

        if (data.success) {
            renderAnnouncements(data.data.announcements);
            renderPagination(data.data.pagination);
        }
    } catch (error) {
        console.error('공지사항 로드 오류:', error);
        alert('공지사항을 불러오는데 실패했습니다.');
    }
}

// 공지사항 목록 렌더링
function renderAnnouncements(announcements) {
    const container = document.getElementById('announcementsList');

    if (announcements.length === 0) {
        container.innerHTML = '<div class="empty-state">등록된 공지사항이 없습니다.</div>';
        return;
    }

    container.innerHTML = announcements.map(announcement => `
        <div class="announcement-item ${announcement.is_pinned ? 'pinned' : ''}"
             onclick="viewAnnouncement(${announcement.id})">
            <div class="announcement-header">
                <h3 class="announcement-title">
                    ${announcement.is_pinned ? '📌 ' : ''}
                    ${escapeHtml(announcement.title)}
                </h3>
                <div class="announcement-badges">
                    <span class="priority-badge priority-${announcement.priority}">
                        ${getPriorityText(announcement.priority)}
                    </span>
                </div>
            </div>
            <div class="announcement-content">${escapeHtml(announcement.content)}</div>
            <div class="announcement-meta">
                <span>✍️ ${escapeHtml(announcement.author_name)}</span>
                <span>📅 ${formatDate(announcement.published_at)}</span>
                <span>👁️ ${announcement.views}회 조회</span>
                <span>✅ ${announcement.read_count}명 읽음</span>
            </div>
        </div>
    `).join('');
}

// 공지사항 상세 보기
async function viewAnnouncement(id) {
    try {
        const response = await fetch(`/api/announcements/${id}`);
        const data = await response.json();

        if (data.success) {
            const announcement = data.data.announcement;
            const attachments = data.data.attachments;

            document.getElementById('detailTitle').textContent = announcement.title;
            document.getElementById('detailContent').innerHTML = escapeHtml(announcement.content).replace(/\n/g, '<br>');

            const meta = document.querySelector('#announcementDetailModal .announcement-meta');
            meta.innerHTML = `
                <span class="author">작성자: ${escapeHtml(announcement.author_name)}</span>
                <span class="date">발행일: ${formatDate(announcement.published_at)}</span>
                <span class="views">조회수: ${announcement.views}</span>
                <span class="priority-badge priority-${announcement.priority}">
                    ${getPriorityText(announcement.priority)}
                </span>
            `;

            // 첨부파일 렌더링
            const attachmentsContainer = document.getElementById('detailAttachments');
            if (attachments.length > 0) {
                attachmentsContainer.innerHTML = '<h4>첨부파일</h4>' +
                    attachments.map(att => `
                        <div class="attachment-item">
                            <span class="attachment-icon">📎</span>
                            <a href="${att.file_path}" download="${att.file_name}">${att.file_name}</a>
                        </div>
                    `).join('');
            }

            // 수정/삭제 버튼 이벤트
            document.getElementById('editAnnouncementBtn').onclick = () => {
                closeModals();
                openAnnouncementModal(announcement);
            };

            document.getElementById('deleteAnnouncementBtn').onclick = () => {
                if (confirm('정말 이 공지사항을 삭제하시겠습니까?')) {
                    deleteAnnouncement(id);
                }
            };

            document.getElementById('announcementDetailModal').style.display = 'flex';
        }
    } catch (error) {
        console.error('공지사항 상세 조회 오류:', error);
        alert('공지사항을 불러오는데 실패했습니다.');
    }
}

// 공지사항 작성/수정 모달 열기
function openAnnouncementModal(announcement = null) {
    const modal = document.getElementById('announcementModal');
    const form = document.getElementById('announcementForm');
    form.reset();

    if (announcement) {
        document.getElementById('modalTitle').textContent = '공지사항 수정';
        document.getElementById('announcementId').value = announcement.id;
        document.getElementById('title').value = announcement.title;
        document.getElementById('content').value = announcement.content;
        document.getElementById('priority').value = announcement.priority;
        document.getElementById('target_type').value = announcement.target_type;
        document.getElementById('is_pinned').checked = announcement.is_pinned;
    } else {
        document.getElementById('modalTitle').textContent = '공지사항 작성';
    }

    modal.style.display = 'flex';
}

// 공지사항 저장
async function saveAnnouncement() {
    const form = document.getElementById('announcementForm');
    const formData = new FormData();

    const id = document.getElementById('announcementId').value;
    const data = {
        title: document.getElementById('title').value,
        content: document.getElementById('content').value,
        priority: document.getElementById('priority').value,
        target_type: document.getElementById('target_type').value,
        is_pinned: document.getElementById('is_pinned').checked
    };

    // 첨부파일 처리
    const attachments = document.getElementById('attachments').files;
    for (let i = 0; i < attachments.length; i++) {
        formData.append('attachments', attachments[i]);
    }

    Object.keys(data).forEach(key => {
        formData.append(key, data[key]);
    });

    try {
        const url = id ? `/api/announcements/${id}` : '/api/announcements';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            alert(id ? '공지사항이 수정되었습니다.' : '공지사항이 발행되었습니다.');
            closeModals();
            loadAnnouncements();
        } else {
            alert(result.error || '저장에 실패했습니다.');
        }
    } catch (error) {
        console.error('공지사항 저장 오류:', error);
        alert('저장에 실패했습니다.');
    }
}

// 공지사항 삭제
async function deleteAnnouncement(id) {
    try {
        const response = await fetch(`/api/announcements/${id}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            alert('공지사항이 삭제되었습니다.');
            closeModals();
            loadAnnouncements();
        } else {
            alert(data.error || '삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('공지사항 삭제 오류:', error);
        alert('삭제에 실패했습니다.');
    }
}

// 페이지네이션 렌더링
function renderPagination(pagination) {
    const container = document.getElementById('pagination');
    const { page, totalPages } = pagination;

    let html = '';

    if (page > 1) {
        html += `<button onclick="changePage(${page - 1})">이전</button>`;
    }

    for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++) {
        html += `<button class="${i === page ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }

    if (page < totalPages) {
        html += `<button onclick="changePage(${page + 1})">다음</button>`;
    }

    container.innerHTML = html;
}

// 페이지 변경
function changePage(page) {
    currentPage = page;
    loadAnnouncements();
}

// 모달 닫기
function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
}

// 유틸리티 함수
function getPriorityText(priority) {
    const texts = {
        urgent: '긴급',
        high: '높음',
        normal: '보통'
    };
    return texts[priority] || priority;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR') + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}
