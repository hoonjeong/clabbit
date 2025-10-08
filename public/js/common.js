/**
 * 토스트 메시지 표시
 */
function showToast(message, type = 'success') {
  // 기존 토스트가 있으면 제거
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    background: ${type === 'success' ? '#28A745' : '#DC3545'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
    font-weight: 500;
  `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '1';
  }, 100);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * 확인 다이얼로그
 */
function confirmDialog(message) {
  return confirm(message);
}

/**
 * 로딩 표시
 */
function showLoading() {
  let loading = document.getElementById('loading');
  if (!loading) {
    loading = document.createElement('div');
    loading.id = 'loading';
    loading.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    `;
    loading.innerHTML = '<div style="color: white; font-size: 1.5rem;">로딩중...</div>';
    document.body.appendChild(loading);
  }
  loading.style.display = 'flex';
}

function hideLoading() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.display = 'none';
  }
}

/**
 * 날짜 포맷팅
 */
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * 나이 계산
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * 전화번호 포맷팅
 */
function formatPhoneNumber(value) {
  const numbers = value.replace(/[^\d]/g, '');

  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
}
