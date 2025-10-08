// 과제 관리 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 상태 관리
    let assignments = [];
    let selectedAssignment = null;
    let submissions = [];
    let currentTab = 'given'; // given, received
    let currentFilter = 'all'; // all, pending, submitted, graded

    // DOM 요소
    const assignmentsList = document.getElementById('assignmentsList');
    const assignmentDetail = document.getElementById('assignmentDetail');
    const createAssignmentBtn = document.getElementById('createAssignment');
    const assignmentModal = document.getElementById('assignmentModal');
    const assignmentForm = document.getElementById('assignmentForm');
    const submissionModal = document.getElementById('submissionModal');
    const submissionForm = document.getElementById('submissionForm');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchAssignments');
    const classFilter = document.getElementById('classFilter');
    const statusFilter = document.getElementById('statusFilter');
    const dueDateSort = document.getElementById('dueDateSort');

    // 초기화
    init();

    function init() {
        setupEventListeners();
        loadFilters();
        checkUserRole();
        loadAssignments();
    }

    // 사용자 역할 확인
    async function checkUserRole() {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            const userRole = data.user.role;

            // 교사인 경우 과제 생성 버튼 표시
            if (userRole === 'teacher' || userRole === 'admin') {
                createAssignmentBtn.style.display = 'block';
                document.getElementById('givenTab').style.display = 'block';
            } else {
                // 학생인 경우 받은 과제 탭만 표시
                currentTab = 'received';
                document.getElementById('receivedTab').click();
                document.getElementById('givenTab').style.display = 'none';
            }
        } catch (error) {
            console.error('사용자 정보 확인 실패:', error);
        }
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 탭 전환
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        // 필터 버튼
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => applyFilter(btn.dataset.filter));
        });

        // 과제 생성
        createAssignmentBtn.addEventListener('click', openCreateModal);

        // 과제 폼 제출
        assignmentForm.addEventListener('submit', handleAssignmentSubmit);

        // 제출 폼
        submissionForm.addEventListener('submit', handleSubmissionSubmit);

        // 검색 및 필터
        searchInput.addEventListener('input', debounce(loadAssignments, 300));
        classFilter.addEventListener('change', loadAssignments);
        statusFilter.addEventListener('change', loadAssignments);
        dueDateSort.addEventListener('change', loadAssignments);

        // 파일 첨부
        document.getElementById('attachmentInput')?.addEventListener('change', handleFileAttachment);
        document.getElementById('submissionFile')?.addEventListener('change', handleSubmissionFile);

        // 모달 닫기
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', closeModals);
        });

        // 학생 선택 토글
        document.getElementById('targetType')?.addEventListener('change', toggleStudentSelection);

        // 일괄 채점
        document.getElementById('bulkGrade')?.addEventListener('click', openBulkGradingModal);

        // 미제출자 알림
        document.getElementById('notifyNonSubmitters')?.addEventListener('click', sendReminderToNonSubmitters);
    }

    // 필터 로드
    async function loadFilters() {
        try {
            const response = await fetch('/api/classes');
            const classes = await response.json();

            classFilter.innerHTML = '<option value="">전체 수업</option>';
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.id;
                option.textContent = cls.name;
                classFilter.appendChild(option);
            });
        } catch (error) {
            console.error('필터 로드 실패:', error);
        }
    }

    // 과제 목록 로드
    async function loadAssignments() {
        try {
            const params = new URLSearchParams({
                tab: currentTab,
                search: searchInput.value,
                class_id: classFilter.value,
                status: statusFilter.value,
                sort: dueDateSort.value
            });

            const response = await fetch(`/api/class-management/assignments?${params}`);
            assignments = await response.json();

            renderAssignments();
            updateStatistics();
        } catch (error) {
            console.error('과제 로드 실패:', error);
            showToast('과제를 불러오는데 실패했습니다.', 'error');
        }
    }

    // 과제 렌더링
    function renderAssignments() {
        assignmentsList.innerHTML = '';

        const filteredAssignments = filterAssignments(assignments);

        if (filteredAssignments.length === 0) {
            assignmentsList.innerHTML = '<div class="no-assignments">과제가 없습니다.</div>';
            return;
        }

        filteredAssignments.forEach(assignment => {
            const card = createAssignmentCard(assignment);
            assignmentsList.appendChild(card);
        });
    }

    // 과제 카드 생성
    function createAssignmentCard(assignment) {
        const card = document.createElement('div');
        card.className = 'assignment-card';
        card.dataset.assignmentId = assignment.id;

        const dueStatus = getDueStatus(assignment.due_date);
        const submissionRate = currentTab === 'given'
            ? `${assignment.submitted_count}/${assignment.total_students}`
            : assignment.is_submitted ? '제출 완료' : '미제출';

        const statusClass = assignment.is_submitted ? 'submitted' : dueStatus.class;

        card.innerHTML = `
            <div class="assignment-header">
                <h3 class="assignment-title">${assignment.title}</h3>
                <span class="assignment-status ${statusClass}">${dueStatus.text}</span>
            </div>
            <div class="assignment-info">
                <div class="assignment-meta">
                    <span class="assignment-class">
                        <i class="fas fa-chalkboard"></i> ${assignment.class_name}
                    </span>
                    <span class="assignment-teacher">
                        <i class="fas fa-user-tie"></i> ${assignment.teacher_name}
                    </span>
                </div>
                <div class="assignment-due">
                    <i class="fas fa-calendar-alt"></i>
                    마감: ${formatDateTime(assignment.due_date)}
                </div>
                ${assignment.total_score ? `
                    <div class="assignment-score">
                        <i class="fas fa-star"></i>
                        배점: ${assignment.total_score}점
                    </div>
                ` : ''}
            </div>
            <div class="assignment-progress">
                <div class="submission-status">
                    <i class="fas fa-check-circle"></i>
                    ${submissionRate}
                </div>
                ${currentTab === 'given' ? `
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(assignment.submitted_count / assignment.total_students) * 100}%"></div>
                    </div>
                ` : ''}
            </div>
            <div class="assignment-actions">
                ${currentTab === 'given' ? `
                    <button class="btn-sm" onclick="viewSubmissions(${assignment.id})">
                        제출 현황
                    </button>
                    <button class="btn-sm" onclick="editAssignment(${assignment.id})">
                        수정
                    </button>
                    <button class="btn-sm btn-danger" onclick="deleteAssignment(${assignment.id})">
                        삭제
                    </button>
                ` : `
                    <button class="btn-sm btn-primary" onclick="viewAssignmentDetail(${assignment.id})">
                        상세보기
                    </button>
                    ${!assignment.is_submitted && !dueStatus.isPast ? `
                        <button class="btn-sm btn-success" onclick="openSubmissionModal(${assignment.id})">
                            과제 제출
                        </button>
                    ` : ''}
                    ${assignment.is_submitted ? `
                        <button class="btn-sm" onclick="viewMySubmission(${assignment.id})">
                            제출 내역
                        </button>
                    ` : ''}
                `}
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                selectAssignment(assignment);
            }
        });

        return card;
    }

    // 과제 선택
    function selectAssignment(assignment) {
        selectedAssignment = assignment;

        // 선택 표시
        document.querySelectorAll('.assignment-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelector(`[data-assignment-id="${assignment.id}"]`).classList.add('selected');

        // 상세 정보 표시
        renderAssignmentDetail(assignment);
    }

    // 과제 상세 렌더링
    function renderAssignmentDetail(assignment) {
        assignmentDetail.innerHTML = `
            <div class="detail-header">
                <h2>${assignment.title}</h2>
                <div class="detail-actions">
                    ${currentTab === 'given' ? `
                        <button class="btn" onclick="downloadAllSubmissions(${assignment.id})">
                            <i class="fas fa-download"></i> 전체 다운로드
                        </button>
                        <button class="btn" onclick="exportGrades(${assignment.id})">
                            <i class="fas fa-file-excel"></i> 성적 내보내기
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="detail-content">
                <div class="detail-section">
                    <h3>과제 설명</h3>
                    <p>${assignment.description || '설명이 없습니다.'}</p>
                </div>

                ${assignment.attachments && assignment.attachments.length > 0 ? `
                    <div class="detail-section">
                        <h3>첨부 파일</h3>
                        <div class="attachment-list">
                            ${assignment.attachments.map(file => `
                                <div class="attachment-item">
                                    <i class="fas fa-file"></i>
                                    <a href="${file.url}" download="${file.name}">${file.name}</a>
                                    <span class="file-size">${formatFileSize(file.size)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <div class="detail-section">
                    <h3>과제 정보</h3>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>수업:</label>
                            <span>${assignment.class_name}</span>
                        </div>
                        <div class="info-item">
                            <label>담당교사:</label>
                            <span>${assignment.teacher_name}</span>
                        </div>
                        <div class="info-item">
                            <label>마감일:</label>
                            <span>${formatDateTime(assignment.due_date)}</span>
                        </div>
                        <div class="info-item">
                            <label>배점:</label>
                            <span>${assignment.total_score || '-'}점</span>
                        </div>
                        <div class="info-item">
                            <label>지각 제출:</label>
                            <span>${assignment.allow_late_submission ? '허용' : '불가'}</span>
                        </div>
                    </div>
                </div>

                ${currentTab === 'given' ? `
                    <div class="detail-section">
                        <h3>제출 현황</h3>
                        <div class="submission-stats">
                            <div class="stat-card">
                                <div class="stat-value">${assignment.submitted_count}</div>
                                <div class="stat-label">제출</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${assignment.total_students - assignment.submitted_count}</div>
                                <div class="stat-label">미제출</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${assignment.graded_count || 0}</div>
                                <div class="stat-label">채점 완료</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${assignment.average_score || '-'}</div>
                                <div class="stat-label">평균 점수</div>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // 제출 현황이 있으면 로드
        if (currentTab === 'given') {
            loadSubmissions(assignment.id);
        }
    }

    // 제출 현황 로드
    async function loadSubmissions(assignmentId) {
        try {
            const response = await fetch(`/api/class-management/assignments/${assignmentId}/submissions`);
            submissions = await response.json();

            renderSubmissions();
        } catch (error) {
            console.error('제출 현황 로드 실패:', error);
        }
    }

    // 제출 현황 렌더링
    function renderSubmissions() {
        const submissionsSection = document.createElement('div');
        submissionsSection.className = 'detail-section';
        submissionsSection.innerHTML = `
            <h3>학생별 제출 현황</h3>
            <div class="submissions-table">
                <table>
                    <thead>
                        <tr>
                            <th><input type="checkbox" id="selectAllSubmissions"></th>
                            <th>학생명</th>
                            <th>제출일시</th>
                            <th>첨부파일</th>
                            <th>점수</th>
                            <th>상태</th>
                            <th>액션</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${submissions.map(submission => `
                            <tr data-submission-id="${submission.id}">
                                <td><input type="checkbox" class="submission-checkbox" value="${submission.id}"></td>
                                <td>${submission.student_name}</td>
                                <td>${submission.submission_date ? formatDateTime(submission.submission_date) : '-'}</td>
                                <td>
                                    ${submission.attachments && submission.attachments.length > 0 ? `
                                        <a href="${submission.attachments[0].url}" download>
                                            <i class="fas fa-download"></i> ${submission.attachments.length}개
                                        </a>
                                    ` : '-'}
                                </td>
                                <td>
                                    ${submission.score !== null ? `
                                        <span class="score-badge">${submission.score}/${selectedAssignment.total_score}</span>
                                    ` : '-'}
                                </td>
                                <td>
                                    <span class="status-badge ${getSubmissionStatusClass(submission)}">
                                        ${getSubmissionStatus(submission)}
                                    </span>
                                </td>
                                <td>
                                    ${submission.is_submitted ? `
                                        <button class="btn-icon" onclick="gradeSubmission(${submission.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn-icon" onclick="viewSubmission(${submission.id})">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    ` : `
                                        <button class="btn-icon" onclick="sendReminder(${submission.student_id})">
                                            <i class="fas fa-bell"></i>
                                        </button>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        assignmentDetail.appendChild(submissionsSection);

        // 전체 선택 이벤트
        document.getElementById('selectAllSubmissions')?.addEventListener('change', (e) => {
            document.querySelectorAll('.submission-checkbox').forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        });
    }

    // 탭 전환
    function switchTab(tab) {
        currentTab = tab;

        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        loadAssignments();
    }

    // 필터 적용
    function applyFilter(filter) {
        currentFilter = filter;

        filterButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        renderAssignments();
    }

    // 과제 필터링
    function filterAssignments(assignments) {
        if (currentFilter === 'all') return assignments;

        return assignments.filter(assignment => {
            switch (currentFilter) {
                case 'pending':
                    return !assignment.is_submitted;
                case 'submitted':
                    return assignment.is_submitted && assignment.score === null;
                case 'graded':
                    return assignment.score !== null;
                default:
                    return true;
            }
        });
    }

    // 과제 생성 모달 열기
    function openCreateModal() {
        selectedAssignment = null;
        assignmentForm.reset();
        document.getElementById('modalTitle').textContent = '새 과제 만들기';
        assignmentModal.style.display = 'block';

        // 마감일 기본값 설정 (1주일 후)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        document.getElementById('dueDate').value = nextWeek.toISOString().slice(0, 16);
    }

    // 과제 수정
    window.editAssignment = async function(id) {
        try {
            const response = await fetch(`/api/class-management/assignments/${id}`);
            const assignment = await response.json();

            selectedAssignment = assignment;

            // 폼에 데이터 채우기
            document.getElementById('assignmentTitle').value = assignment.title;
            document.getElementById('description').value = assignment.description || '';
            document.getElementById('classId').value = assignment.class_id;
            document.getElementById('dueDate').value = assignment.due_date.slice(0, 16);
            document.getElementById('totalScore').value = assignment.total_score || '';
            document.getElementById('targetType').value = assignment.target_type;
            document.getElementById('allowLateSubmission').checked = assignment.allow_late_submission;

            document.getElementById('modalTitle').textContent = '과제 수정';
            assignmentModal.style.display = 'block';
        } catch (error) {
            console.error('과제 정보 로드 실패:', error);
        }
    };

    // 과제 삭제
    window.deleteAssignment = async function(id) {
        if (!confirm('이 과제를 삭제하시겠습니까? 제출된 과제도 함께 삭제됩니다.')) return;

        try {
            const response = await fetch(`/api/class-management/assignments/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                showToast('과제가 삭제되었습니다.', 'success');
                loadAssignments();
            }
        } catch (error) {
            console.error('과제 삭제 실패:', error);
            showToast('삭제에 실패했습니다.', 'error');
        }
    };

    // 과제 폼 제출
    async function handleAssignmentSubmit(e) {
        e.preventDefault();

        const formData = new FormData(assignmentForm);
        const assignmentData = {
            title: formData.get('title'),
            description: formData.get('description'),
            class_id: formData.get('class_id'),
            due_date: formData.get('due_date'),
            total_score: formData.get('total_score') || null,
            target_type: formData.get('target_type'),
            allow_late_submission: formData.get('allow_late_submission') === 'on'
        };

        // 학생 선택 (개별 과제인 경우)
        if (assignmentData.target_type === 'individual') {
            const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked'))
                .map(cb => cb.value);

            if (selectedStudents.length === 0) {
                showToast('대상 학생을 선택하세요.', 'warning');
                return;
            }

            assignmentData.student_ids = selectedStudents;
        }

        try {
            const url = selectedAssignment
                ? `/api/class-management/assignments/${selectedAssignment.id}`
                : '/api/class-management/assignments';

            const method = selectedAssignment ? 'PUT' : 'POST';

            // 파일 업로드가 있는 경우
            const fileInput = document.getElementById('attachmentInput');
            if (fileInput.files.length > 0) {
                const uploadFormData = new FormData();
                Object.keys(assignmentData).forEach(key => {
                    uploadFormData.append(key, assignmentData[key]);
                });

                for (const file of fileInput.files) {
                    uploadFormData.append('attachments', file);
                }

                const response = await fetch(url, {
                    method: method,
                    body: uploadFormData
                });

                if (response.ok) {
                    showToast(selectedAssignment ? '과제가 수정되었습니다.' : '과제가 생성되었습니다.', 'success');
                    closeModals();
                    loadAssignments();
                }
            } else {
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(assignmentData)
                });

                if (response.ok) {
                    showToast(selectedAssignment ? '과제가 수정되었습니다.' : '과제가 생성되었습니다.', 'success');
                    closeModals();
                    loadAssignments();
                }
            }
        } catch (error) {
            console.error('과제 저장 실패:', error);
            showToast('저장에 실패했습니다.', 'error');
        }
    }

    // 제출 모달 열기
    window.openSubmissionModal = function(assignmentId) {
        const assignment = assignments.find(a => a.id === assignmentId);
        if (!assignment) return;

        selectedAssignment = assignment;

        document.getElementById('submissionAssignmentTitle').textContent = assignment.title;
        document.getElementById('submissionDueDate').textContent = formatDateTime(assignment.due_date);

        submissionModal.style.display = 'block';
    };

    // 제출 처리
    async function handleSubmissionSubmit(e) {
        e.preventDefault();

        const formData = new FormData(submissionForm);

        // 파일 확인
        const fileInput = document.getElementById('submissionFile');
        if (fileInput.files.length === 0 && !formData.get('content')) {
            showToast('파일을 첨부하거나 내용을 입력하세요.', 'warning');
            return;
        }

        try {
            const uploadFormData = new FormData();
            uploadFormData.append('content', formData.get('content'));

            if (fileInput.files.length > 0) {
                for (const file of fileInput.files) {
                    uploadFormData.append('attachments', file);
                }
            }

            const response = await fetch(`/api/class-management/assignments/${selectedAssignment.id}/submit`, {
                method: 'POST',
                body: uploadFormData
            });

            if (response.ok) {
                showToast('과제가 제출되었습니다.', 'success');
                closeModals();
                loadAssignments();
            }
        } catch (error) {
            console.error('과제 제출 실패:', error);
            showToast('제출에 실패했습니다.', 'error');
        }
    }

    // 채점 모달
    window.gradeSubmission = async function(submissionId) {
        const submission = submissions.find(s => s.id === submissionId);
        if (!submission) return;

        const score = prompt(`점수를 입력하세요 (0-${selectedAssignment.total_score}):`, submission.score || '');
        if (score === null) return;

        const feedback = prompt('피드백을 입력하세요:', submission.feedback || '');

        try {
            const response = await fetch(`/api/class-management/submissions/${submissionId}/grade`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score: parseFloat(score),
                    feedback: feedback
                })
            });

            if (response.ok) {
                showToast('채점이 완료되었습니다.', 'success');
                loadSubmissions(selectedAssignment.id);
            }
        } catch (error) {
            console.error('채점 실패:', error);
            showToast('채점에 실패했습니다.', 'error');
        }
    };

    // 제출물 보기
    window.viewSubmission = async function(submissionId) {
        try {
            const response = await fetch(`/api/class-management/submissions/${submissionId}`);
            const submission = await response.json();

            const modal = document.createElement('div');
            modal.className = 'submission-view-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${submission.student_name}의 제출물</h3>
                        <span class="close-modal">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="submission-content">
                            <h4>제출 내용</h4>
                            <p>${submission.content || '내용이 없습니다.'}</p>
                        </div>
                        ${submission.attachments && submission.attachments.length > 0 ? `
                            <div class="submission-attachments">
                                <h4>첨부 파일</h4>
                                ${submission.attachments.map(file => `
                                    <div class="attachment-item">
                                        <a href="${file.url}" download="${file.name}">
                                            <i class="fas fa-file"></i> ${file.name}
                                        </a>
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        ${submission.score !== null ? `
                            <div class="submission-grade">
                                <h4>채점 결과</h4>
                                <p>점수: ${submission.score}/${selectedAssignment.total_score}</p>
                                <p>피드백: ${submission.feedback || '없음'}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;

            modal.querySelector('.close-modal').addEventListener('click', () => {
                modal.remove();
            });

            document.body.appendChild(modal);
        } catch (error) {
            console.error('제출물 조회 실패:', error);
        }
    };

    // 미제출자 알림
    window.sendReminder = async function(studentId) {
        if (!confirm('이 학생에게 과제 제출 알림을 보내시겠습니까?')) return;

        try {
            const response = await fetch(`/api/class-management/assignments/${selectedAssignment.id}/remind`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_ids: [studentId]
                })
            });

            if (response.ok) {
                showToast('알림이 전송되었습니다.', 'success');
            }
        } catch (error) {
            console.error('알림 전송 실패:', error);
            showToast('알림 전송에 실패했습니다.', 'error');
        }
    };

    // 미제출자 일괄 알림
    async function sendReminderToNonSubmitters() {
        const nonSubmitters = submissions.filter(s => !s.is_submitted).map(s => s.student_id);

        if (nonSubmitters.length === 0) {
            showToast('미제출자가 없습니다.', 'info');
            return;
        }

        if (!confirm(`${nonSubmitters.length}명의 미제출자에게 알림을 보내시겠습니까?`)) return;

        try {
            const response = await fetch(`/api/class-management/assignments/${selectedAssignment.id}/remind`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_ids: nonSubmitters
                })
            });

            if (response.ok) {
                showToast('알림이 전송되었습니다.', 'success');
            }
        } catch (error) {
            console.error('알림 전송 실패:', error);
            showToast('알림 전송에 실패했습니다.', 'error');
        }
    }

    // 통계 업데이트
    function updateStatistics() {
        const stats = {
            total: assignments.length,
            pending: assignments.filter(a => !a.is_submitted).length,
            submitted: assignments.filter(a => a.is_submitted && a.score === null).length,
            graded: assignments.filter(a => a.score !== null).length
        };

        document.getElementById('totalAssignments').textContent = stats.total;
        document.getElementById('pendingCount').textContent = stats.pending;
        document.getElementById('submittedCount').textContent = stats.submitted;
        document.getElementById('gradedCount').textContent = stats.graded;
    }

    // 모달 닫기
    function closeModals() {
        assignmentModal.style.display = 'none';
        submissionModal.style.display = 'none';
        selectedAssignment = null;
    }

    // 헬퍼 함수들
    function getDueStatus(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const diff = due - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (diff < 0) {
            return { text: '마감됨', class: 'overdue', isPast: true };
        } else if (days === 0) {
            return { text: '오늘 마감', class: 'due-today', isPast: false };
        } else if (days === 1) {
            return { text: '내일 마감', class: 'due-tomorrow', isPast: false };
        } else if (days <= 3) {
            return { text: `${days}일 남음`, class: 'due-soon', isPast: false };
        } else {
            return { text: `${days}일 남음`, class: 'due-later', isPast: false };
        }
    }

    function getSubmissionStatus(submission) {
        if (!submission.is_submitted) return '미제출';
        if (submission.score !== null) return '채점 완료';
        return '제출됨';
    }

    function getSubmissionStatusClass(submission) {
        if (!submission.is_submitted) return 'not-submitted';
        if (submission.score !== null) return 'graded';
        return 'submitted';
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
});