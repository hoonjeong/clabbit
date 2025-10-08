/**
 * 에러 핸들링 미들웨어
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // 상태 코드 설정
  const statusCode = err.statusCode || 500;

  // 에러 응답
  res.status(statusCode).json({
    success: false,
    error: err.message || '서버 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * 404 핸들러
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: '요청한 페이지를 찾을 수 없습니다.'
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
