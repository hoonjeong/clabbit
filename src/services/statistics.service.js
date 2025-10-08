const db = require('../config/database');
const StudentEventModel = require('../models/student-event.model');
const { getDateRanges } = require('../utils/dateHelper');
const { CHART_PERIOD } = require('../config/constants');

class StatisticsService {
  // 대시보드 통계
  static async getDashboardStats(academyId) {
    const { monthStart } = getDateRanges();
    const today = new Date().toISOString().split('T')[0];

    // 전체 재원생 수 (students 테이블에서 조회)
    const [[totalStudents]] = await db.execute(
      'SELECT COUNT(*) as count FROM students WHERE academy_id = ? AND status = ?',
      [academyId, 'active']
    );

    // 이번달 신규 학생 수 (student_events에서 join + rejoin)
    const thisMonthNew = await StudentEventModel.countNew(
      academyId,
      monthStart,
      today
    );

    // 이번달 퇴원 학생 수 (student_events에서 exit)
    const thisMonthWithdrawal = await StudentEventModel.countExit(
      academyId,
      monthStart,
      today
    );

    return {
      totalStudents: totalStudents.count,
      thisMonthNew,
      thisMonthWithdrawal
    };
  }

  // 월별 전체 원생 추이
  static async getMonthlyTrend(academyId) {
    const labels = [];
    const data = [];
    const today = new Date();

    // 최근 6개월
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      const monthEndStr = monthEnd.toISOString().split('T')[0];

      labels.push(`${monthDate.getMonth() + 1}월`);

      // 해당 월 말일 기준 재원생 수
      const [[count]] = await db.execute(
        `SELECT COUNT(*) as count FROM students
         WHERE academy_id = ?
         AND DATE(enrollment_date) <= ?
         AND (withdrawal_date IS NULL OR DATE(withdrawal_date) > ?)`,
        [academyId, monthEndStr, monthEndStr]
      );
      data.push(count.count);
    }

    return { labels, data };
  }

  // 신규/퇴원 통합 차트 데이터
  static async getChartData(academyId, period = CHART_PERIOD.DAILY) {
    const labels = [];
    const newStudents = [];
    const withdrawalStudents = [];

    const dateRanges = this.getChartDateRanges(period);

    for (const range of dateRanges) {
      labels.push(range.label);

      // 신규 학생 (student_events에서 join + rejoin)
      const newCount = await StudentEventModel.countNew(
        academyId,
        range.start,
        range.end
      );
      newStudents.push(newCount);

      // 퇴원 학생 (student_events에서 exit)
      const withdrawalCount = await StudentEventModel.countExit(
        academyId,
        range.start,
        range.end
      );
      withdrawalStudents.push(withdrawalCount);
    }

    return {
      labels,
      newStudents,
      withdrawalStudents
    };
  }

  // 차트 기간별 날짜 범위 계산
  static getChartDateRanges(period) {
    const today = new Date();
    const ranges = [];

    if (period === CHART_PERIOD.DAILY) {
      // 최근 7일
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        ranges.push({
          label: `${date.getMonth() + 1}/${date.getDate()}`,
          start: dateStr,
          end: dateStr
        });
      }
    } else if (period === CHART_PERIOD.WEEKLY) {
      // 최근 4주
      for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (today.getDay() + i * 7));

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        ranges.push({
          label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0]
        });
      }
    } else if (period === CHART_PERIOD.MONTHLY) {
      // 최근 6개월
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

        ranges.push({
          label: `${monthDate.getMonth() + 1}월`,
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0]
        });
      }
    }

    return ranges;
  }

  // 이슈 학생 통계
  static async getIssueStudents(academyId) {
    // TODO: 출결 기능 구현 후 추가
    return {
      longAbsence: [],
      frequentLate: [],
      lowAttendance: [],
      unpaidFees: []
    };
  }
}

module.exports = StatisticsService;
