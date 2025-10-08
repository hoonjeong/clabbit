const StatisticsService = require('../services/statistics.service');
const { successResponse, errorResponse } = require('../utils/response');
const { CHART_PERIOD } = require('../config/constants');

/**
 * 대시보드 컨트롤러
 * 학원 통계 및 차트 데이터 제공
 */
class DashboardController {
  /**
   * 대시보드 통계 조회
   * @route GET /api/dashboard/stats
   */
  static async getStats(req, res) {
    try {
      const academyId = req.academyId;
      const stats = await StatisticsService.getDashboardStats(academyId);
      return successResponse(res, { data: stats });

    } catch (error) {
      console.error('통계 조회 오류:', error);
      return errorResponse(res, '통계를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 차트 데이터 조회
   * @route GET /api/dashboard/charts/:period
   */
  static async getChartData(req, res) {
    try {
      const academyId = req.academyId;
      const { period } = req.params;

      const validPeriods = Object.values(CHART_PERIOD);
      if (!validPeriods.includes(period)) {
        return errorResponse(res, '올바른 기간을 선택해주세요.', 400);
      }

      const chartData = await StatisticsService.getChartData(academyId, period);
      return successResponse(res, { data: chartData });

    } catch (error) {
      console.error('차트 데이터 조회 오류:', error);
      return errorResponse(res, '차트 데이터를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 월별 추이 조회
   * @route GET /api/dashboard/monthly-trend
   */
  static async getMonthlyTrend(req, res) {
    try {
      const academyId = req.academyId;
      const trendData = await StatisticsService.getMonthlyTrend(academyId);
      return successResponse(res, { data: trendData });

    } catch (error) {
      console.error('월별 추이 조회 오류:', error);
      return errorResponse(res, '월별 추이를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 이슈 학생 조회
   * @route GET /api/dashboard/issues
   */
  static async getIssues(req, res) {
    try {
      const academyId = req.academyId;
      const issues = await StatisticsService.getIssueStudents(academyId);
      return successResponse(res, issues);

    } catch (error) {
      console.error('이슈 조회 오류:', error);
      return errorResponse(res, '이슈를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = DashboardController;
