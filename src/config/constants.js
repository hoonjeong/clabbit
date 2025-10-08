/**
 * 애플리케이션 상수 정의
 */

// 세션 설정
const SESSION = {
  MAX_AGE: 1000 * 60 * 60 * 24 * 7, // 7일
  SECRET_KEY: process.env.SESSION_SECRET || 'dev-only-secret-key-DO-NOT-USE-IN-PRODUCTION'
};

// 파일 업로드 설정
const FILE_UPLOAD = {
  MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: {
    IMAGES_AND_PDF: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  },
  TEMP_DIR: `${process.env.UPLOAD_DIR || 'uploads'}/temp/`,
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads/'
};

// 페이지네이션 기본값
const PAGINATION = {
  DEFAULT_LIMIT: 20,
  DEFAULT_PAGE: 1
};

// 학생 상태
const STUDENT_STATUS = {
  ACTIVE: 'active',
  WITHDRAWN: 'withdrawn'
};

// 학원 검증 상태
const ACADEMY_VERIFICATION = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed'
};

// 차트 기간
const CHART_PERIOD = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
};

module.exports = {
  SESSION,
  FILE_UPLOAD,
  PAGINATION,
  STUDENT_STATUS,
  ACADEMY_VERIFICATION,
  CHART_PERIOD
};
