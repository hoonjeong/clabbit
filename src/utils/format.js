/**
 * 포맷팅 관련 유틸리티 함수
 */

/**
 * 전화번호 포맷팅
 * @param {string} phone - 전화번호
 * @returns {string} 포맷된 전화번호 (010-1234-5678)
 */
function formatPhoneNumber(phone) {
    if (!phone) return '';

    // 숫자만 추출
    const cleaned = phone.replace(/\D/g, '');

    // 길이에 따라 포맷팅
    if (cleaned.length === 11) {
        // 010-1234-5678
        return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.length === 10) {
        // 02-1234-5678 또는 031-123-4567
        if (cleaned.startsWith('02')) {
            return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
        } else {
            return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
        }
    } else if (cleaned.length === 9) {
        // 02-123-4567
        return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    }

    return phone;
}

/**
 * 금액 포맷팅 (천단위 콤마)
 * @param {number|string} amount - 금액
 * @returns {string} 포맷된 금액 (예: 1,234,567)
 */
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '0';

    const num = parseInt(amount);
    if (isNaN(num)) return '0';

    return num.toLocaleString('ko-KR');
}

/**
 * 금액을 한글로 표현
 * @param {number} amount - 금액
 * @returns {string} 한글 표현 (예: 123만 4천원)
 */
function formatCurrencyKorean(amount) {
    if (!amount || amount === 0) return '0원';

    const units = ['', '만', '억', '조'];
    const smallUnits = ['', '천', '백', '십'];

    let result = '';
    let unitIndex = 0;

    while (amount > 0 && unitIndex < units.length) {
        const part = amount % 10000;
        if (part > 0) {
            if (result) result = ' ' + result;
            result = part.toLocaleString() + units[unitIndex] + result;
        }
        amount = Math.floor(amount / 10000);
        unitIndex++;
    }

    return result + '원';
}

/**
 * 파일 크기 포맷팅
 * @param {number} bytes - 바이트 수
 * @returns {string} 포맷된 크기 (예: 1.5 MB)
 */
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 백분율 포맷팅
 * @param {number} value - 값
 * @param {number} total - 전체
 * @param {number} decimals - 소수점 자릿수
 * @returns {string} 백분율 (예: 45.5%)
 */
function formatPercentage(value, total, decimals = 1) {
    if (!total || total === 0) return '0%';

    const percentage = (value / total) * 100;
    return percentage.toFixed(decimals) + '%';
}

/**
 * 이름 마스킹 처리
 * @param {string} name - 이름
 * @returns {string} 마스킹된 이름 (예: 김*수)
 */
function maskName(name) {
    if (!name || name.length < 2) return name;

    if (name.length === 2) {
        return name[0] + '*';
    } else {
        return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
    }
}

/**
 * 전화번호 마스킹 처리
 * @param {string} phone - 전화번호
 * @returns {string} 마스킹된 전화번호 (예: 010-****-5678)
 */
function maskPhoneNumber(phone) {
    const formatted = formatPhoneNumber(phone);
    if (!formatted) return '';

    const parts = formatted.split('-');
    if (parts.length === 3) {
        return parts[0] + '-****-' + parts[2];
    }
    return formatted;
}

/**
 * 이메일 마스킹 처리
 * @param {string} email - 이메일
 * @returns {string} 마스킹된 이메일 (예: ab***@example.com)
 */
function maskEmail(email) {
    if (!email || !email.includes('@')) return email;

    const [localPart, domain] = email.split('@');
    if (localPart.length <= 2) {
        return localPart + '***@' + domain;
    }

    return localPart.substring(0, 2) + '***@' + domain;
}

/**
 * 숫자에 0 패딩 추가
 * @param {number} num - 숫자
 * @param {number} length - 전체 길이
 * @returns {string} 패딩된 숫자 (예: 007)
 */
function padNumber(num, length = 2) {
    return String(num).padStart(length, '0');
}

/**
 * 문자열 자르기 (말줄임표 추가)
 * @param {string} str - 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {string} 잘린 문자열 (예: "긴 문자열...")
 */
function truncateString(str, maxLength) {
    if (!str || str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
}

/**
 * 빈 값 처리
 * @param {any} value - 값
 * @param {string} defaultValue - 기본값
 * @returns {string} 값 또는 기본값
 */
function emptyToDefault(value, defaultValue = '-') {
    if (value === null || value === undefined || value === '') {
        return defaultValue;
    }
    return value;
}

/**
 * 학년 포맷팅
 * @param {string} grade - 학년 문자열
 * @returns {string} 간단한 학년 표현
 */
function formatGrade(grade) {
    if (!grade) return '';

    const gradeMap = {
        '초등 1학년': '초1',
        '초등 2학년': '초2',
        '초등 3학년': '초3',
        '초등 4학년': '초4',
        '초등 5학년': '초5',
        '초등 6학년': '초6',
        '중학교 1학년': '중1',
        '중학교 2학년': '중2',
        '중학교 3학년': '중3',
        '고등학교 1학년': '고1',
        '고등학교 2학년': '고2',
        '고등학교 3학년': '고3',
        '재수생': '재수',
        '기타': '기타'
    };

    return gradeMap[grade] || grade;
}

module.exports = {
    formatPhoneNumber,
    formatCurrency,
    formatCurrencyKorean,
    formatFileSize,
    formatPercentage,
    maskName,
    maskPhoneNumber,
    maskEmail,
    padNumber,
    truncateString,
    emptyToDefault,
    formatGrade
};