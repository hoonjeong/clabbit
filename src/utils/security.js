/**
 * 보안 관련 유틸리티 함수
 */

/**
 * SQL ORDER BY에 사용할 컬럼명 검증
 * @param {string} column - 검증할 컬럼명
 * @param {string[]} allowedColumns - 허용된 컬럼 목록
 * @returns {string} 검증된 컬럼명
 * @throws {Error} 허용되지 않은 컬럼명인 경우
 */
const validateSortColumn = (column, allowedColumns) => {
  if (!allowedColumns.includes(column)) {
    throw new Error(`Invalid sort column: ${column}`);
  }
  return column;
};

/**
 * SQL ORDER BY에 사용할 정렬 방향 검증
 * @param {string} order - 정렬 방향
 * @returns {string} 'ASC' 또는 'DESC'
 */
const validateSortOrder = (order) => {
  const upperOrder = (order || 'ASC').toUpperCase();
  if (upperOrder !== 'ASC' && upperOrder !== 'DESC') {
    return 'ASC';
  }
  return upperOrder;
};

/**
 * XSS 방지를 위한 HTML 이스케이프
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
const escapeHtml = (str) => {
  if (!str) return '';

  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  return String(str).replace(/[&<>"'\/]/g, char => htmlEscapes[char]);
};

/**
 * SQL LIKE 패턴에서 특수문자 이스케이프
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
const escapeLikePattern = (str) => {
  if (!str) return '';
  // MySQL LIKE에서 특수문자 이스케이프
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
};

/**
 * 전화번호 형식 검증
 * @param {string} phone - 전화번호
 * @returns {boolean} 유효성 여부
 */
const validatePhoneNumber = (phone) => {
  if (!phone) return true; // 선택 필드
  const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
  return phoneRegex.test(phone.replace(/-/g, ''));
};

/**
 * 이메일 형식 검증
 * @param {string} email - 이메일
 * @returns {boolean} 유효성 여부
 */
const validateEmail = (email) => {
  if (!email) return true; // 선택 필드
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 날짜 형식 검증 (YYYY-MM-DD)
 * @param {string} date - 날짜 문자열
 * @returns {boolean} 유효성 여부
 */
const validateDate = (date) => {
  if (!date) return true; // 선택 필드
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
};

/**
 * 숫자 ID 검증
 * @param {any} id - 검증할 ID
 * @returns {boolean} 유효성 여부
 */
const validateNumericId = (id) => {
  return !isNaN(id) && parseInt(id) > 0;
};

/**
 * 문자열 길이 검증
 * @param {string} str - 검증할 문자열
 * @param {number} maxLength - 최대 길이
 * @returns {boolean} 유효성 여부
 */
const validateLength = (str, maxLength) => {
  return !str || str.length <= maxLength;
};

/**
 * 파일 확장자 검증
 * @param {string} filename - 파일명
 * @param {string[]} allowedExtensions - 허용된 확장자 목록
 * @returns {boolean} 유효성 여부
 */
const validateFileExtension = (filename, allowedExtensions) => {
  if (!filename) return false;
  const ext = filename.split('.').pop().toLowerCase();
  return allowedExtensions.includes(`.${ext}`);
};

/**
 * MIME 타입 검증
 * @param {string} mimeType - MIME 타입
 * @param {string[]} allowedTypes - 허용된 MIME 타입 목록
 * @returns {boolean} 유효성 여부
 */
const validateMimeType = (mimeType, allowedTypes) => {
  return allowedTypes.includes(mimeType);
};

module.exports = {
  validateSortColumn,
  validateSortOrder,
  escapeHtml,
  escapeLikePattern,
  validatePhoneNumber,
  validateEmail,
  validateDate,
  validateNumericId,
  validateLength,
  validateFileExtension,
  validateMimeType
};