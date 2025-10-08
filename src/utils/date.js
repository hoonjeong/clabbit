/**
 * 날짜 관련 유틸리티 함수
 */

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 * @param {Date|string} date - 날짜 객체 또는 문자열
 * @returns {string} YYYY-MM-DD 형식의 날짜
 */
function formatDate(date) {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

/**
 * 날짜를 YYYY-MM-DD HH:mm:ss 형식으로 포맷
 * @param {Date|string} date - 날짜 객체 또는 문자열
 * @returns {string} YYYY-MM-DD HH:mm:ss 형식의 날짜시간
 */
function formatDateTime(date) {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const dateStr = formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    return `${dateStr} ${hours}:${minutes}:${seconds}`;
}

/**
 * 날짜를 한국어 형식으로 포맷 (YYYY년 MM월 DD일)
 * @param {Date|string} date - 날짜 객체 또는 문자열
 * @returns {string} YYYY년 MM월 DD일 형식
 */
function formatDateKorean(date) {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    return `${year}년 ${month}월 ${day}일`;
}

/**
 * 두 날짜 사이의 일수 계산
 * @param {Date|string} startDate - 시작 날짜
 * @param {Date|string} endDate - 종료 날짜
 * @returns {number} 일수 차이
 */
function getDaysDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

/**
 * 현재 월의 첫 날 가져오기
 * @returns {string} YYYY-MM-DD 형식의 날짜
 */
function getFirstDayOfMonth() {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return formatDate(firstDay);
}

/**
 * 현재 월의 마지막 날 가져오기
 * @returns {string} YYYY-MM-DD 형식의 날짜
 */
function getLastDayOfMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return formatDate(lastDay);
}

/**
 * 날짜에서 연월 추출 (YYYY-MM)
 * @param {Date|string} date - 날짜
 * @returns {string} YYYY-MM 형식
 */
function getYearMonth(date) {
    if (!date) return '';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');

    return `${year}-${month}`;
}

/**
 * 나이 계산
 * @param {Date|string} birthDate - 생년월일
 * @returns {number} 나이
 */
function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return 0;

    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age;
}

/**
 * 요일 이름 가져오기
 * @param {number} dayIndex - 요일 인덱스 (0: 일요일, 1: 월요일, ...)
 * @returns {string} 요일 이름
 */
function getDayName(dayIndex) {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[dayIndex] || '';
}

/**
 * 날짜 유효성 검사
 * @param {string} dateString - YYYY-MM-DD 형식의 날짜 문자열
 * @returns {boolean} 유효성 여부
 */
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    const timestamp = date.getTime();

    if (!timestamp && timestamp !== 0) return false;

    return dateString === formatDate(date);
}

/**
 * 상대적 시간 표현 (예: 3일 전, 2시간 전)
 * @param {Date|string} date - 날짜
 * @returns {string} 상대적 시간
 */
function getRelativeTime(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const now = new Date();
    const diff = now - d;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) return formatDate(d);
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
}

module.exports = {
    formatDate,
    formatDateTime,
    formatDateKorean,
    getDaysDifference,
    getFirstDayOfMonth,
    getLastDayOfMonth,
    getYearMonth,
    calculateAge,
    getDayName,
    isValidDate,
    getRelativeTime
};