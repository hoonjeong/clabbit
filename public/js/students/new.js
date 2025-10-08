// 신규 학생 추가 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('studentForm');
    const studentPhoneInput = document.getElementById('student_phone');
    const parentPhoneInput = document.getElementById('parent_phone');
    const cancelBtn = document.getElementById('cancelBtn');

    // 전화번호 자동 포맷팅
    function formatPhoneNumber(value) {
        const numbers = value.replace(/[^\d]/g, '');
        if (numbers.length <= 3) return numbers;
        if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }

    if (studentPhoneInput) {
        studentPhoneInput.addEventListener('input', function(e) {
            this.value = formatPhoneNumber(this.value);
        });
    }

    if (parentPhoneInput) {
        parentPhoneInput.addEventListener('input', function(e) {
            this.value = formatPhoneNumber(this.value);
        });
    }

    // 유효성 검사
    function validateForm(formData) {
        let isValid = true;

        // 에러 메시지 초기화
        document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
        document.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));

        // 필수 필드 검증
        if (!formData.name || formData.name.trim() === '') {
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

        if (!formData.parent_phone || formData.parent_phone.trim() === '') {
            document.getElementById('parentPhoneError').textContent = '학부모 전화번호를 입력해주세요.';
            document.getElementById('parent_phone').classList.add('error');
            isValid = false;
        } else if (!/^01[0-9]-\d{4}-\d{4}$/.test(formData.parent_phone)) {
            document.getElementById('parentPhoneError').textContent = '올바른 전화번호 형식이 아닙니다.';
            document.getElementById('parent_phone').classList.add('error');
            isValid = false;
        }

        // 학생 전화번호 (선택)
        if (formData.student_phone && formData.student_phone.trim() !== '') {
            if (!/^01[0-9]-\d{4}-\d{4}$/.test(formData.student_phone)) {
                document.getElementById('studentPhoneError').textContent = '올바른 전화번호 형식이 아닙니다.';
                document.getElementById('student_phone').classList.add('error');
                isValid = false;
            }
        }

        return isValid;
    }

    // 폼 제출
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const data = Object.fromEntries(formData);

        // 유효성 검사
        if (!validateForm(data)) {
            return;
        }

        // 로딩 상태
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '등록 중...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert('학생이 등록되었습니다.');
                window.location.href = '/students';
            } else {
                alert(result.error || result.message || '등록에 실패했습니다.');
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        } catch (error) {
            alert('서버 오류가 발생했습니다.');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // 취소 버튼
    cancelBtn.addEventListener('click', function() {
        if (confirm('입력한 내용이 저장되지 않습니다. 취소하시겠습니까?')) {
            window.location.href = '/students';
        }
    });

    // 로그아웃
    document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        if (confirm('로그아웃 하시겠습니까?')) {
            window.location.href = '/login';
        }
    });
});
