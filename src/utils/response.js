/**
 * 성공 응답
 */
function successResponse(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    ...data
  });
}

/**
 * 에러 응답
 */
function errorResponse(res, message, statusCode = 500, data = {}) {
  return res.status(statusCode).json({
    success: false,
    error: message,
    ...data
  });
}

module.exports = {
  successResponse,
  errorResponse
};
