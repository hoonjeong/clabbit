/**
 * 수업 상세/수정 페이지 스크립트
 * 수업 정보 조회, 수정, 학생 관리 기능
 */

let classId = null;
let currentStudents = [];

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', function() {
    // URL에서 수업 ID 추출
    const pathParts = window.location.pathname.split('/');
    classId = pathParts[pathParts.length - 1];

    if (classId && classId !== 'new') {
        loadClassData();
        loadEnrolledStudents();
    }

    setupEventListeners();
    loadTeachers();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // 수업 정보 저장
    const classForm = document.getElementById('classForm');
    if (classForm) {
        classForm.addEventListener('submit', handleClassSubmit);
    }

    // 학생 추가 버튼
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', showStudentModal);
    }

    // 수업 삭제 버튼
    const deleteBtn = document.getElementById('deleteClassBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteClass);
    }
}

// 강사 목록 로드
async function loadTeachers() {
    try {
        const data = await APIClient.get(CONSTANTS.API.TEACHERS.LIST);

        if (data.success && data.teachers) {
            const teacherSelect = document.getElementById('teacher_id');
            teacherSelect.innerHTML = '<option value="">선택하세요</option>';

            data.teachers.forEach(teacher => {
                const option = document.createElement('option');
                option.value = teacher.id;
                option.textContent = teacher.name;
                teacherSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('강사 목록 로드 오류:', error);
    }
}

// 수업 데이터 로드
async function loadClassData() {
    try {
        const data = await APIClient.get(CONSTANTS.API.CLASSES.DETAIL(classId));

        if (data.success) {
            const cls = data.class;

            // 폼 필드 채우기
            document.getElementById('class_name').value = cls.class_name || '';
            document.getElementById('grade').value = cls.grade || '';
            document.getElementById('subject').value = cls.subject || '';
            document.getElementById('teacher_id').value = cls.teacher_id || '';
            document.getElementById('class_time').value = cls.class_time || '';
            document.getElementById('max_students').value = cls.max_students || 0;
            document.getElementById('tuition').value = cls.tuition || 0;
            document.getElementById('start_date').value = cls.start_date || '';
            document.getElementById('end_date').value = cls.end_date || '';
            document.getElementById('notes').value = cls.notes || '';

            // 상태 표시
            if (cls.status) {
                const statusBadge = document.getElementById('statusBadge');
                if (statusBadge) {
                    statusBadge.textContent = cls.status === 'active' ? '진행중' : '종강';
                    statusBadge.className = cls.status === 'active' ? 'badge badge-success' : 'badge badge-secondary';
                }
            }
        } else {
            alert(data.error || '수업 정보를 불러오는데 실패했습니다.');
            window.location.href = '/classes';
        }
    } catch (error) {
        ErrorHandler.handle(error, '수업 정보를 불러오는 중 오류가 발생했습니다.');
        window.location.href = '/classes';
    }
}

// 수강 학생 목록 로드
async function loadEnrolledStudents() {
    try {
        const data = await APIClient.get(`/api/classes/${classId}/students`);

        if (data.success) {
            currentStudents = data.students || [];
            displayStudents(currentStudents);
        }
    } catch (error) {
        console.error('수강 학생 목록 로드 오류:', error);
    }
}

// 학생 목록 표시
function displayStudents(students) {
    const tbody = document.getElementById('studentsTableBody');

    if (!tbody) return;

    if (students.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding: 40px; text-align: center; color: #999;">
                    <p>수강 중인 학생이 없습니다</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = students.map((student, index) => `
        <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 12px; text-align: center;">${index + 1}</td>
            <td style="padding: 12px;">
                <div style="font-weight: 600; color: #333;">${student.name}</div>
                <div style="font-size: 13px; color: #999;">${student.grade || '-'}</div>
            </td>
            <td style="padding: 12px; color: #666;">${student.school || '-'}</td>
            <td style="padding: 12px; color: #666;">${student.parent_phone || '-'}</td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="removeStudent(${student.enrollment_id})" class="btn btn-sm btn-danger">
                    제외
                </button>
            </td>
        </tr>
    `).join('');

    // 현재 인원 업데이트
    const currentStudentsEl = document.getElementById('current_students');
    if (currentStudentsEl) {
        currentStudentsEl.textContent = students.length;
    }
}

// 수업 정보 저장
async function handleClassSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // 빈 문자열을 null로 변환
    Object.keys(data).forEach(key => {
        if (data[key] === '') {
            data[key] = null;
        }
    });

    // 숫자 타입 변환
    if (data.max_students) data.max_students = parseInt(data.max_students);
    if (data.tuition) data.tuition = parseFloat(data.tuition);

    try {
        const result = classId && classId !== 'new'
            ? await APIClient.put(CONSTANTS.API.CLASSES.UPDATE(classId), data)
            : await APIClient.post(CONSTANTS.API.CLASSES.CREATE, data);

        if (result.success) {
            alert(result.message || CONSTANTS.MESSAGES.SAVE_SUCCESS);

            if (classId === 'new' && result.classId) {
                window.location.href = `/classes/${result.classId}`;
            } else {
                loadClassData();
            }
        } else {
            alert(result.error || '저장에 실패했습니다.');
        }
    } catch (error) {
        ErrorHandler.handle(error, '저장 중 오류가 발생했습니다.');
    }
}

// 학생 추가 모달 표시
function showStudentModal() {
    // 학생 선택 모달을 표시하는 로직
    window.location.href = `/classes/${classId}/enroll-students`;
}

// 학생 제외
async function removeStudent(enrollmentId) {
    const confirmed = await Modal.confirm(
        '이 학생을 수업에서 제외하시겠습니까?',
        '학생 제외'
    );

    if (!confirmed) return;

    try {
        const data = await APIClient.delete(`/api/enrollments/${enrollmentId}`);

        if (data.success) {
            alert(data.message || '학생이 제외되었습니다.');
            loadEnrolledStudents();
            loadClassData(); // 현재 인원 업데이트
        } else {
            alert(data.error || '학생 제외에 실패했습니다.');
        }
    } catch (error) {
        ErrorHandler.handle(error, '학생 제외 중 오류가 발생했습니다.');
    }
}

// 수업 삭제
async function deleteClass() {
    const confirmed = await Modal.confirm(
        '정말 이 수업을 삭제하시겠습니까?\\n수강 중인 학생이 있는 경우 삭제할 수 없습니다.',
        '수업 삭제'
    );

    if (!confirmed) return;

    try {
        const data = await APIClient.delete(CONSTANTS.API.CLASSES.DELETE(classId));

        if (data.success) {
            alert(data.message || CONSTANTS.MESSAGES.DELETE_SUCCESS);
            window.location.href = '/classes';
        } else {
            alert(data.error || '삭제에 실패했습니다.');
        }
    } catch (error) {
        ErrorHandler.handle(error, '삭제 중 오류가 발생했습니다.');
    }
}
