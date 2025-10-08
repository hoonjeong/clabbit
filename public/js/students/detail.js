// 학생 상세 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    let isEditMode = false;
    let originalData = {};

    // DOM 요소
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const studentInfo = document.getElementById('studentInfo');
    const studentForm = document.getElementById('studentForm');

    // 버튼
    const enrollBtn = document.getElementById('enrollBtn');
    const editBtn = document.getElementById('editBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const saveBtn = document.getElementById('saveBtn');
    const withdrawBtn = document.getElementById('withdrawBtn');

    // 전화번호 자동 포맷팅
    function formatPhoneNumber(value) {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }

    // 학생 정보 로드
    async function loadStudent() {
        try {
            const response = await fetch(`/api/students/${studentId}`);
            const result = await response.json();

            if (result.success) {
                displayStudent(result.student);
                originalData = { ...result.student };
            } else {
                showError(result.message || '학생 정보를 불러올 수 없습니다.');
            }
        } catch (error) {
            console.error('학생 정보 로드 오류:', error);
            showError('서버 오류가 발생했습니다.');
        }
    }

    // 학생 정보 표시
    function displayStudent(student) {
        loadingState.style.display = 'none';
        errorState.style.display = 'none';
        studentInfo.style.display = 'block';

        // 기본 정보
        document.getElementById('name').value = student.name || '';
        // 날짜 형식 변환 (YYYY-MM-DD만 추출)
        const birthDate = student.birth_date ? student.birth_date.split('T')[0] : '';
        document.getElementById('birth_date').value = birthDate;
        document.getElementById('school').value = student.school || '';
        document.getElementById('grade').value = student.grade || '';

        // 연락처
        document.getElementById('student_phone').value = student.student_phone || '';
        document.getElementById('parent_phone').value = student.parent_phone || '';
        document.getElementById('address').value = student.address || '';

        // 메모
        document.getElementById('memo').value = student.memo || '';

        // 등록 구분 (신규/재원)
        if (student.enrollment_type === 'returning') {
            document.getElementById('enrollment_type_returning').checked = true;
        } else {
            document.getElementById('enrollment_type_new').checked = true;
        }

        // 상태 정보 - 날짜 형식 변환
        const enrollmentDate = student.enrollment_date ? student.enrollment_date.split('T')[0] : '-';
        document.getElementById('enrollmentDate').textContent = enrollmentDate;

        const statusBadge = document.getElementById('statusBadge');
        if (student.status === 'active') {
            statusBadge.textContent = '재원';
            statusBadge.className = 'status-badge status-active';
            withdrawBtn.style.display = 'inline-block';
            withdrawBtn.textContent = '퇴원 처리';
            withdrawBtn.className = 'btn btn-danger';
        } else {
            statusBadge.textContent = '퇴원';
            statusBadge.className = 'status-badge status-withdrawn';
            withdrawBtn.style.display = 'inline-block';
            withdrawBtn.textContent = '재원 처리';
            withdrawBtn.className = 'btn btn-success';

            const withdrawalDateGroup = document.getElementById('withdrawalDateGroup');
            withdrawalDateGroup.style.display = 'block';
            const withdrawalDate = student.withdrawal_date ? student.withdrawal_date.split('T')[0] : '-';
            document.getElementById('withdrawalDate').textContent = withdrawalDate;
        }
    }

    // 에러 표시
    function showError(message) {
        loadingState.style.display = 'none';
        studentInfo.style.display = 'none';
        errorState.style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
    }

    // 수정 모드 토글
    function toggleEditMode(enable) {
        isEditMode = enable;

        // 입력 필드 활성화/비활성화
        const inputs = studentForm.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (enable) {
                input.removeAttribute('disabled');
            } else {
                input.setAttribute('disabled', 'disabled');
            }
        });

        // 버튼 표시 전환
        if (enable) {
            editBtn.style.display = 'none';
            cancelEditBtn.style.display = 'inline-block';
            saveBtn.style.display = 'inline-block';
            withdrawBtn.style.display = 'none';

            // 전화번호 포맷팅 이벤트 추가
            const studentPhoneInput = document.getElementById('student_phone');
            const parentPhoneInput = document.getElementById('parent_phone');

            studentPhoneInput.addEventListener('input', function() {
                this.value = formatPhoneNumber(this.value);
            });

            parentPhoneInput.addEventListener('input', function() {
                this.value = formatPhoneNumber(this.value);
            });
        } else {
            editBtn.style.display = 'inline-block';
            cancelEditBtn.style.display = 'none';
            saveBtn.style.display = 'none';

            if (originalData.status === 'active') {
                withdrawBtn.style.display = 'inline-block';
                withdrawBtn.textContent = '퇴원 처리';
                withdrawBtn.className = 'btn btn-danger';
            } else {
                withdrawBtn.style.display = 'inline-block';
                withdrawBtn.textContent = '재원 처리';
                withdrawBtn.className = 'btn btn-success';
            }
        }
    }

    // 유효성 검사
    function validateForm(formData) {
        let isValid = true;

        // 에러 메시지 초기화
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));

        // 필수 필드 검증
        if (!formData.name || (typeof formData.name === 'string' && formData.name.trim() === '')) {
            document.getElementById('nameError').textContent = '학생 이름을 입력해주세요.';
            document.getElementById('name').classList.add('error');
            isValid = false;
        }

        if (!formData.birth_date) {
            document.getElementById('birthDateError').textContent = '생년월일을 입력해주세요.';
            document.getElementById('birth_date').classList.add('error');
            isValid = false;
        } else if (new Date(formData.birth_date) > new Date()) {
            document.getElementById('birthDateError').textContent = '미래 날짜는 입력할 수 없습니다.';
            document.getElementById('birth_date').classList.add('error');
            isValid = false;
        }

        if (!formData.parent_phone || (typeof formData.parent_phone === 'string' && formData.parent_phone.trim() === '')) {
            document.getElementById('parentPhoneError').textContent = '학부모 전화번호를 입력해주세요.';
            document.getElementById('parent_phone').classList.add('error');
            isValid = false;
        } else if (!/^01[0-9]-\d{4}-\d{4}$/.test(formData.parent_phone)) {
            document.getElementById('parentPhoneError').textContent = '올바른 전화번호 형식이 아닙니다.';
            document.getElementById('parent_phone').classList.add('error');
            isValid = false;
        }

        // 학생 전화번호 (선택)
        if (formData.student_phone && formData.student_phone !== null && formData.student_phone.trim() !== '') {
            if (!/^01[0-9]-\d{4}-\d{4}$/.test(formData.student_phone)) {
                document.getElementById('studentPhoneError').textContent = '올바른 전화번호 형식이 아닙니다.';
                document.getElementById('student_phone').classList.add('error');
                isValid = false;
            }
        }

        return isValid;
    }

    // 학생 정보 수정
    async function updateStudent(data) {
        try {
            const response = await fetch(`/api/students/${studentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('학생 정보가 수정되었습니다.');
                toggleEditMode(false);
                loadStudent(); // 새로고침
            } else {
                alert(result.error || result.message || '수정에 실패했습니다.');
            }
        } catch (error) {
            console.error('학생 정보 수정 오류:', error);
            alert('서버 오류가 발생했습니다.');
        }
    }

    // 퇴원/재원 처리
    async function handleWithdrawal() {
        const isWithdrawn = originalData.status === 'withdrawn';
        const action = isWithdrawn ? '재원' : '퇴원';
        const endpoint = isWithdrawn ? 'reinstate' : 'withdraw';

        if (!confirm(`정말 ${action} 처리하시겠습니까?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/students/${studentId}/${endpoint}`, {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                alert(`${action} 처리가 완료되었습니다.`);
                loadStudent(); // 새로고침
            } else {
                alert(result.message || `${action} 처리에 실패했습니다.`);
            }
        } catch (error) {
            console.error(`${action} 처리 오류:`, error);
            alert('서버 오류가 발생했습니다.');
        }
    }

    // 이벤트 리스너
    editBtn.addEventListener('click', function() {
        toggleEditMode(true);
    });

    cancelEditBtn.addEventListener('click', function() {
        if (confirm('수정을 취소하시겠습니까? 변경사항이 저장되지 않습니다.')) {
            displayStudent(originalData);
            toggleEditMode(false);
        }
    });

    saveBtn.addEventListener('click', async function() {
        const formData = new FormData(studentForm);
        const data = {};

        // FormData를 객체로 변환하면서 빈 문자열을 null로 처리
        for (let [key, value] of formData.entries()) {
            data[key] = value.trim() === '' ? null : value;
        }

        // 유효성 검사
        if (!validateForm(data)) {
            return;
        }

        // 로딩 상태
        const originalText = this.textContent;
        this.textContent = '저장 중...';
        this.disabled = true;

        await updateStudent(data);

        this.textContent = originalText;
        this.disabled = false;
    });

    enrollBtn.addEventListener('click', function() {
        window.location.href = `/students/${studentId}/enroll`;
    });

    withdrawBtn.addEventListener('click', handleWithdrawal);

    // 로그아웃
    document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('로그아웃 하시겠습니까?')) {
            window.location.href = '/login';
        }
    });

    // 초기 로드
    loadStudent();
});
