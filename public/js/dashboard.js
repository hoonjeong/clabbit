// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {

    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('로그아웃 하시겠습니까?')) {
                window.location.href = '/logout';
            }
        });
    }

    // 통계 카드 클릭 이벤트
    setupStatCardClicks();

    // 차트 탭 전환
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const period = this.getAttribute('data-period');
            loadCombinedChart(period);
        });
    });

    // 초기 데이터 로드
    loadDashboardData();
    loadMonthlyTrend();
    loadCombinedChart('daily');
});

// 차트 객체
let monthlyTrendChart = null;
let combinedChart = null;

// 통계 카드 클릭 이벤트 설정
function setupStatCardClicks() {
    // 전체 원생 카드 클릭
    const totalStudentsCard = document.getElementById('totalStudentsCard');
    if (totalStudentsCard) {
        totalStudentsCard.addEventListener('click', () => {
            window.location.href = '/students?status=active';
        });
    }

    // 이번달 신규 카드 클릭 - 새로운 API 사용
    const thisMonthNewCard = document.getElementById('thisMonthNewCard');
    if (thisMonthNewCard) {
        thisMonthNewCard.addEventListener('click', () => {
            // student_events 기반 신규 학생 목록 페이지로 이동
            window.location.href = '/students?type=new&period=this_month';
        });
    }

    // 이번달 퇴원 카드 클릭 - 버그 수정: 올바른 URL로 이동
    const thisMonthWithdrawalCard = document.getElementById('thisMonthWithdrawalCard');
    if (thisMonthWithdrawalCard) {
        thisMonthWithdrawalCard.addEventListener('click', () => {
            // student_events 기반 퇴원 학생 목록 페이지로 이동
            window.location.href = '/students?type=exits&period=this_month';
        });
    }
}

// 대시보드 통계 데이터 로드
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard/stats');
        const result = await response.json();

        if (result.success) {
            updateStats(result.data);
        } else {
            console.error('통계 로드 실패:', result.error);
        }
    } catch (error) {
        console.error('데이터 로드 오류:', error);
    }
}

// 통계 카드 업데이트
function updateStats(data) {
    const totalStudentsValue = document.getElementById('totalStudentsValue');
    const thisMonthNewValue = document.getElementById('thisMonthNewValue');
    const thisMonthWithdrawalValue = document.getElementById('thisMonthWithdrawalValue');

    if (totalStudentsValue) {
        totalStudentsValue.innerHTML = `${data.totalStudents}<span class="stat-unit">명</span>`;
    }
    if (thisMonthNewValue) {
        thisMonthNewValue.innerHTML = `${data.thisMonthNew}<span class="stat-unit">명</span>`;
    }
    if (thisMonthWithdrawalValue) {
        thisMonthWithdrawalValue.innerHTML = `${data.thisMonthWithdrawal}<span class="stat-unit">명</span>`;
    }
}

// 월별 추이 차트 로드
async function loadMonthlyTrend() {
    try {
        const response = await fetch('/api/dashboard/monthly-trend');
        const result = await response.json();

        if (!result.success) {
            console.error('월별 추이 로드 실패:', result.error);
            return;
        }

        const data = result.data;
        const hasData = data.data.some(v => v > 0);

        const canvas = document.getElementById('monthlyTrendChart');
        const noDataMsg = document.getElementById('monthlyNoData');

        if (!hasData) {
            // 데이터 없음
            if (monthlyTrendChart) {
                monthlyTrendChart.destroy();
                monthlyTrendChart = null;
            }
            canvas.style.display = 'none';
            if (noDataMsg) noDataMsg.style.display = 'block';
        } else {
            // 차트 표시
            canvas.style.display = 'block';
            if (noDataMsg) noDataMsg.style.display = 'none';

            if (monthlyTrendChart) {
                monthlyTrendChart.data.labels = data.labels;
                monthlyTrendChart.data.datasets[0].data = data.data;
                monthlyTrendChart.update();
            } else {
                monthlyTrendChart = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [{
                            label: '전체 원생',
                            data: data.data,
                            borderColor: '#28A745',
                            backgroundColor: 'rgba(40, 167, 69, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + context.parsed.y + '명';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('월별 추이 로드 오류:', error);
    }
}

// 신규/퇴원 통합 차트 로드
async function loadCombinedChart(period = 'daily') {
    try {
        const response = await fetch(`/api/dashboard/charts/${period}`);
        const result = await response.json();

        if (!result.success) {
            console.error('차트 데이터 로드 실패:', result.error);
            return;
        }

        const data = result.data;
        const hasData = data.newStudents.some(v => v > 0) || data.withdrawalStudents.some(v => v > 0);

        const canvas = document.getElementById('combinedChart');
        const noDataMsg = document.getElementById('combinedNoData');

        if (!hasData) {
            // 데이터 없음
            if (combinedChart) {
                combinedChart.destroy();
                combinedChart = null;
            }
            canvas.style.display = 'none';
            if (noDataMsg) noDataMsg.style.display = 'block';
        } else {
            // 차트 표시
            canvas.style.display = 'block';
            if (noDataMsg) noDataMsg.style.display = 'none';

            if (combinedChart) {
                combinedChart.data.labels = data.labels;
                combinedChart.data.datasets[0].data = data.newStudents;
                combinedChart.data.datasets[1].data = data.withdrawalStudents;
                combinedChart.update();
            } else {
                combinedChart = new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: data.labels,
                        datasets: [
                            {
                                label: '신규',
                                data: data.newStudents,
                                borderColor: '#007BFF',
                                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: '퇴원',
                                data: data.withdrawalStudents,
                                borderColor: '#DC3545',
                                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                tension: 0.4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + context.parsed.y + '명';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error('통합 차트 로드 오류:', error);
    }
}

// 스크롤 애니메이션
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, {
    threshold: 0.1
});

document.querySelectorAll('.stat-card, .chart-container, .issue-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'all 0.6s ease-out';
    observer.observe(el);
});
