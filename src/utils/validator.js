/**
 * 학생 데이터 유효성 검사
 */
function validateStudent(data) {
  const errors = [];

  // 필수 필드
  if (!data.name || (typeof data.name === 'string' && data.name.trim() === '')) {
    errors.push('학생 이름을 입력해주세요');
  } else if (data.name.length > 100) {
    errors.push('학생 이름은 100자 이내로 입력해주세요');
  } else if (containsSuspiciousPatterns(data.name)) {
    errors.push('학생 이름에 허용되지 않는 문자가 포함되어 있습니다');
  }

  if (!data.birth_date) {
    errors.push('생년월일을 입력해주세요');
  } else if (!isValidDate(data.birth_date)) {
    errors.push('올바른 생년월일 형식이 아닙니다 (YYYY-MM-DD)');
  } else if (new Date(data.birth_date) > new Date()) {
    errors.push('미래 날짜는 입력할 수 없습니다');
  } else if (new Date(data.birth_date) < new Date('1900-01-01')) {
    errors.push('올바른 생년월일을 입력해주세요');
  }

  if (!data.parent_phone || (typeof data.parent_phone === 'string' && data.parent_phone.trim() === '')) {
    errors.push('학부모 전화번호를 입력해주세요');
  } else if (!isValidPhone(data.parent_phone)) {
    errors.push('올바른 전화번호 형식이 아닙니다 (010-XXXX-XXXX)');
  }

  // 선택 필드
  if (data.student_phone && typeof data.student_phone === 'string' && !isValidPhone(data.student_phone)) {
    errors.push('학생 전화번호 형식이 올바르지 않습니다');
  }

  // 텍스트 필드 길이 검증
  if (data.school && data.school.length > 100) {
    errors.push('학교 이름은 100자 이내로 입력해주세요');
  }

  if (data.grade && data.grade.length > 50) {
    errors.push('학년은 50자 이내로 입력해주세요');
  }

  if (data.address && data.address.length > 500) {
    errors.push('주소는 500자 이내로 입력해주세요');
  }

  if (data.memo && data.memo.length > 1000) {
    errors.push('메모는 1000자 이내로 입력해주세요');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 의심스러운 패턴 검증 (SQL Injection, XSS 방지)
 */
function containsSuspiciousPatterns(str) {
  if (!str || typeof str !== 'string') return false;

  // SQL Injection 패턴
  const sqlPatterns = [
    /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(--|\/\*|\*\/|;)/,
    /(\bOR\b.*=.*|AND.*=.*)/i
  ];

  // XSS 패턴
  const xssPatterns = [
    /<script[^>]*>.*<\/script>/i,
    /<iframe[^>]*>/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror 등
    /<img[^>]*onerror/i
  ];

  // 모든 패턴 검사
  const allPatterns = [...sqlPatterns, ...xssPatterns];
  return allPatterns.some(pattern => pattern.test(str));
}

/**
 * 날짜 형식 검증
 */
function isValidDate(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * 전화번호 형식 검증
 */
function isValidPhone(phone) {
  const regex = /^01[0-9]-\d{4}-\d{4}$/;
  return regex.test(phone);
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

module.exports = {
  validateStudent,
  isValidDate,
  isValidPhone,
  formatPhoneNumber,
  containsSuspiciousPatterns
};
