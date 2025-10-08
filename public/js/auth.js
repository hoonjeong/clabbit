// ===========================
// 클래빗 인증 시스템
// JWT 토큰 기반 로그인/회원가입
// ===========================

document.addEventListener('DOMContentLoaded', function() {
    // ==================== 페이지 로드 시 처리 ====================

    // 로그인 페이지: 저장된 이메일 불러오기 및 자동로그인 체크
    if (document.getElementById('loginForm')) {
        initLoginPage();
    }

    // ==================== 로그인 폼 처리 ====================

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // ==================== 회원가입 폼 처리 ====================

    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // ==================== 비밀번호 보기/숨기기 ====================

    const togglePasswordBtn = document.getElementById('togglePassword');
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
    }

    // ==================== 체크박스 상호작용 ====================

    const autoLoginCheckbox = document.getElementById('autoLogin');
    const rememberEmailCheckbox = document.getElementById('rememberEmail');

    if (autoLoginCheckbox && rememberEmailCheckbox) {
        // 자동로그인 체크 시 이메일 저장도 자동 체크
        autoLoginCheckbox.addEventListener('change', function() {
            if (this.checked) {
                rememberEmailCheckbox.checked = true;
            }
        });

        // 이메일 저장 체크 해제 시 자동로그인도 해제
        rememberEmailCheckbox.addEventListener('change', function() {
            if (!this.checked) {
                autoLoginCheckbox.checked = false;
            }
        });
    }

    // ==================== 로그아웃 버튼 처리 ====================

    const logoutButtons = document.querySelectorAll('#sidebarLogoutBtn, #logoutButton, [data-action="logout"]');
    logoutButtons.forEach(btn => {
        btn.addEventListener('click', handleLogout);
    });
});

// ==================== 로그인 페이지 초기화 ====================

async function initLoginPage() {
    // 1. 저장된 이메일 불러오기
    const savedEmail = localStorage.getItem('savedEmail');
    const rememberEmailCheckbox = document.getElementById('rememberEmail');
    const emailInput = document.getElementById('email');

    if (savedEmail && emailInput) {
        emailInput.value = savedEmail;
        if (rememberEmailCheckbox) {
            rememberEmailCheckbox.checked = true;
        }
    }

    // 2. Refresh Token 확인 후 자동로그인 시도
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
        await attemptAutoLogin(refreshToken);
    }
}

// ==================== 자동로그인 시도 ====================

async function attemptAutoLogin(refreshToken) {
    try {
        console.log('🔄 자동로그인 시도 중...');

        // Refresh Token으로 새 Access Token 발급
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (data.success) {
            // Access Token 저장
            localStorage.setItem('accessToken', data.data.accessToken);

            console.log('✅ 자동로그인 성공');

            // 대시보드로 리다이렉트
            showToast('자동로그인 되었습니다', 'success');
            setTimeout(() => {
                window.location.href = '/academies/select';
            }, 500);
        } else {
            // 자동로그인 실패 시 토큰 제거
            console.log('❌ 자동로그인 실패:', data.error);
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('accessToken');
        }

    } catch (error) {
        console.error('자동로그인 오류:', error);
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('accessToken');
    }
}

// ==================== 로그인 폼 제출 ====================

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberEmail = document.getElementById('rememberEmail')?.checked || false;
    const autoLogin = document.getElementById('autoLogin')?.checked || false;

    // 클라이언트 유효성 검사
    if (!validateLoginForm(email, password)) {
        return;
    }

    // 로딩 상태
    const submitButton = document.getElementById('loginBtn');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.innerHTML = '<span class="spinner"></span> 로그인 중...';

    try {
        // API 요청
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                autoLogin
            })
        });

        const data = await response.json();

        if (data.success) {
            // 이메일 저장 처리
            if (rememberEmail) {
                localStorage.setItem('savedEmail', email);
            } else {
                localStorage.removeItem('savedEmail');
            }

            // Access Token 저장
            if (data.data.accessToken) {
                localStorage.setItem('accessToken', data.data.accessToken);
            }

            // 자동로그인 체크 시 Refresh Token 저장
            if (autoLogin && data.data.refreshToken) {
                localStorage.setItem('refreshToken', data.data.refreshToken);
            } else {
                localStorage.removeItem('refreshToken');
            }

            // 사용자 정보 저장 (선택사항)
            if (data.data.user) {
                localStorage.setItem('userInfo', JSON.stringify(data.data.user));
            }

            // 성공 메시지
            showToast('로그인 성공!', 'success');

            // 리다이렉트
            setTimeout(() => {
                window.location.href = data.redirectUrl || '/academies/select';
            }, 500);

        } else {
            // 실패 처리
            showToast(data.error || '로그인에 실패했습니다', 'error');

            // 버튼 복원
            submitButton.disabled = false;
            submitButton.textContent = originalText;

            // 비밀번호 필드 초기화
            document.getElementById('password').value = '';
        }

    } catch (error) {
        console.error('로그인 오류:', error);
        showToast('로그인 중 오류가 발생했습니다', 'error');

        // 버튼 복원
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
}

// ==================== 회원가입 폼 제출 ====================

async function handleSignup(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    // Validation
    if (!validateSignupForm(data)) {
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = '가입 중...';
    submitBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('회원가입이 완료되었습니다!', 'success');
            setTimeout(() => {
                window.location.href = result.redirectUrl || '/academies/select';
            }, 1500);
        } else {
            showToast(result.error || '회원가입에 실패했습니다.', 'error');
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showToast('서버 오류가 발생했습니다', 'error');
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// ==================== 로그아웃 ====================

async function handleLogout(e) {
    e?.preventDefault();

    if (!confirm('로그아웃 하시겠습니까?')) {
        return;
    }

    try {
        const refreshToken = localStorage.getItem('refreshToken');

        // 서버에 로그아웃 요청
        if (refreshToken) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
                },
                body: JSON.stringify({ refreshToken })
            });
        }

        // 로컬스토리지에서 토큰 제거
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');
        // savedEmail은 유지 (사용자가 이메일 저장했다면)

        showToast('로그아웃 되었습니다', 'success');

        setTimeout(() => {
            window.location.href = '/login';
        }, 500);

    } catch (error) {
        console.error('로그아웃 오류:', error);

        // 에러가 발생해도 로컬 데이터는 제거
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userInfo');

        window.location.href = '/login';
    }
}

// ==================== 비밀번호 보기/숨기기 ====================

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('password');
    const eyeSlash = document.getElementById('eyeSlash');

    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        if (eyeSlash) eyeSlash.style.display = 'block';
    } else {
        passwordInput.type = 'password';
        if (eyeSlash) eyeSlash.style.display = 'none';
    }
}

// ==================== 유효성 검사 ====================

function validateLoginForm(email, password) {
    let isValid = true;

    // 이메일 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        showFieldError('email', '이메일을 입력해주세요');
        isValid = false;
    } else if (!emailRegex.test(email)) {
        showFieldError('email', '올바른 이메일 형식이 아닙니다');
        isValid = false;
    } else {
        clearFieldError('email');
    }

    // 비밀번호 검증
    if (!password) {
        showFieldError('password', '비밀번호를 입력해주세요');
        isValid = false;
    } else {
        clearFieldError('password');
    }

    return isValid;
}

function validateSignupForm(data) {
    let isValid = true;

    // Name validation
    if (!data.name || data.name.trim().length < 2) {
        showFieldError('name', '이름을 정확히 입력해주세요');
        isValid = false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
        showFieldError('email', '유효한 이메일 주소를 입력해주세요');
        isValid = false;
    }

    // Password validation (최소 8자)
    if (!data.password || data.password.length < 8) {
        showFieldError('password', '비밀번호는 8자 이상이어야 합니다');
        isValid = false;
    }

    // Password confirmation
    if (data.password !== data.confirmPassword) {
        showFieldError('confirmPassword', '비밀번호가 일치하지 않습니다');
        isValid = false;
    }

    return isValid;
}

// ==================== 에러 표시 헬퍼 ====================

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // 기존 에러 메시지 제거
    clearFieldError(fieldId);

    // 에러 스타일 추가
    field.classList.add('input-error');

    // 에러 메시지 추가
    const errorElement = document.createElement('span');
    errorElement.className = 'error-message';
    errorElement.textContent = message;

    // password-input-wrapper 확인
    const wrapper = field.closest('.password-input-wrapper');
    if (wrapper) {
        wrapper.parentElement.appendChild(errorElement);
    } else {
        field.parentElement.appendChild(errorElement);
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.classList.remove('input-error');

    const wrapper = field.closest('.password-input-wrapper');
    const parent = wrapper ? wrapper.parentElement : field.parentElement;

    const errorElement = parent.querySelector('.error-message');
    if (errorElement) {
        errorElement.remove();
    }
}

// ==================== 토스트 알림 ====================

function showToast(message, type = 'info') {
    // 기존 토스트 제거
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 토스트 생성
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // 페이드 인
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 3초 후 자동 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

// ==================== API 요청 헬퍼 (다른 페이지에서 사용) ====================

async function apiRequest(url, options = {}) {
    const accessToken = localStorage.getItem('accessToken');

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers
        });

        // 401 에러 (인증 실패) 시 토큰 갱신 시도
        if (response.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                const refreshed = await refreshAccessToken(refreshToken);

                if (refreshed) {
                    // 갱신 성공 시 원래 요청 재시도
                    const newAccessToken = localStorage.getItem('accessToken');
                    headers['Authorization'] = `Bearer ${newAccessToken}`;

                    return fetch(url, {
                        ...options,
                        headers
                    });
                }
            }

            // 갱신 실패 시 로그인 페이지로 리다이렉트
            window.location.href = '/login';
            return;
        }

        return response;

    } catch (error) {
        console.error('API 요청 오류:', error);
        throw error;
    }
}

async function refreshAccessToken(refreshToken) {
    try {
        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ refreshToken })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('accessToken', data.data.accessToken);
            return true;
        } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            return false;
        }

    } catch (error) {
        console.error('토큰 갱신 오류:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        return false;
    }
}
