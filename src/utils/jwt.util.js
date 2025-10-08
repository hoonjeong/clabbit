/**
 * JWT 토큰 유틸리티
 * Access Token 및 Refresh Token 생성/검증
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// 토큰 만료 시간
const ACCESS_TOKEN_EXPIRY = '15m';  // 15분
const REFRESH_TOKEN_EXPIRY = '30d'; // 30일

/**
 * Access Token 생성
 * @param {Object} payload - 토큰에 포함할 데이터 (userId, email, role 등)
 * @returns {string} JWT Access Token
 */
function generateAccessToken(payload) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET이 설정되지 않았습니다.');
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'clabbit',
    subject: 'access'
  });
}

/**
 * Refresh Token 생성
 * @param {Object} payload - 토큰에 포함할 데이터 (userId만 포함)
 * @returns {string} JWT Refresh Token
 */
function generateRefreshToken(payload) {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET이 설정되지 않았습니다.');
  }

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
    issuer: 'clabbit',
    subject: 'refresh'
  });
}

/**
 * Access Token 검증
 * @param {string} token - JWT Access Token
 * @returns {Object} 디코딩된 페이로드
 * @throws {Error} 토큰이 유효하지 않은 경우
 */
function verifyAccessToken(token) {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET이 설정되지 않았습니다.');
  }

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('토큰이 만료되었습니다.');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('유효하지 않은 토큰입니다.');
    } else {
      throw error;
    }
  }
}

/**
 * Refresh Token 검증
 * @param {string} token - JWT Refresh Token
 * @returns {Object} 디코딩된 페이로드
 * @throws {Error} 토큰이 유효하지 않은 경우
 */
function verifyRefreshToken(token) {
  if (!JWT_REFRESH_SECRET) {
    throw new Error('JWT_REFRESH_SECRET이 설정되지 않았습니다.');
  }

  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh Token이 만료되었습니다.');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('유효하지 않은 Refresh Token입니다.');
    } else {
      throw error;
    }
  }
}

/**
 * Refresh Token 만료 시간 계산
 * @returns {Date} 만료 시간 (30일 후)
 */
function getRefreshTokenExpiryDate() {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30); // 30일 추가
  return expiryDate;
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshTokenExpiryDate,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
};
