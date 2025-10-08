/**
 * 오늘, 이번주 시작일, 이번달 시작일 반환
 */
function getDateRanges() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // 이번 주 시작일 (일요일)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // 이번 달 시작일
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartStr = monthStart.toISOString().split('T')[0];

  return {
    today: todayStr,
    weekStart: weekStartStr,
    monthStart: monthStartStr
  };
}

/**
 * 나이 계산
 */
function calculateAge(birthDate) {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * 날짜 포맷팅 (YYYY-MM-DD)
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

module.exports = {
  getDateRanges,
  calculateAge,
  formatDate
};
