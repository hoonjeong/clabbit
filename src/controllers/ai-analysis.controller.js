/**
 * AI 분석 컨트롤러
 * AI 기반 성적 분석 및 추천 API 엔드포인트
 */

const AIAnalysisService = require('../services/ai-analysis.service');
const RecommendationService = require('../services/recommendation.service');

class AIAnalysisController {
    /**
     * 학생 성적 AI 분석
     */
    async analyzeStudent(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;

            const analysis = await AIAnalysisService.analyzeStudentPerformance(
                academyId,
                parseInt(studentId)
            );

            res.json(analysis);
        } catch (error) {
            console.error('학생 분석 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 학습 패턴 예측
     */
    async predictPattern(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;
            const { period = 30 } = req.query;

            const pattern = await AIAnalysisService.predictLearningPattern(
                academyId,
                parseInt(studentId),
                parseInt(period)
            );

            res.json(pattern);
        } catch (error) {
            console.error('패턴 예측 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 학급 전체 분석
     */
    async analyzeClass(req, res) {
        try {
            const academyId = req.academyId;
            const { classId } = req.params;

            const analysis = await AIAnalysisService.analyzeClassPerformance(
                academyId,
                parseInt(classId)
            );

            res.json(analysis);
        } catch (error) {
            console.error('학급 분석 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 맞춤형 학습 계획 생성
     */
    async generateStudyPlan(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;

            const plan = await RecommendationService.generateStudyPlan(
                academyId,
                parseInt(studentId)
            );

            res.json(plan);
        } catch (error) {
            console.error('학습 계획 생성 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 학습 습관 개선 제안
     */
    async suggestHabits(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;

            const suggestions = await RecommendationService.suggestHabitImprovements(
                academyId,
                parseInt(studentId)
            );

            res.json(suggestions);
        } catch (error) {
            console.error('습관 개선 제안 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 동기부여 콘텐츠 생성
     */
    async getMotivation(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;

            const content = await RecommendationService.generateMotivationalContent(
                academyId,
                parseInt(studentId)
            );

            res.json(content);
        } catch (error) {
            console.error('동기부여 콘텐츠 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 학부모 리포트 생성
     */
    async generateParentReport(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;

            const report = await RecommendationService.generateParentReport(
                academyId,
                parseInt(studentId)
            );

            res.json(report);
        } catch (error) {
            console.error('학부모 리포트 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * AI 인사이트 대시보드 데이터
     */
    async getDashboardInsights(req, res) {
        try {
            const academyId = req.academyId;

            // 여러 학생의 분석 데이터 수집
            const insights = {
                topPerformers: [],
                needsAttention: [],
                classAverage: 0,
                trendAnalysis: {},
                recommendations: []
            };

            // TODO: 전체 학원 레벨 인사이트 구현

            res.json({
                success: true,
                data: insights
            });
        } catch (error) {
            console.error('대시보드 인사이트 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 성적 예측 차트 데이터
     */
    async getPredictionChart(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;

            const analysis = await AIAnalysisService.analyzeStudentPerformance(
                academyId,
                parseInt(studentId)
            );

            // Chart.js 형식으로 데이터 변환
            const chartData = {
                labels: [],
                datasets: [
                    {
                        label: '실제 점수',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        tension: 0.1
                    },
                    {
                        label: '예측 점수',
                        data: [],
                        borderColor: 'rgb(255, 99, 132)',
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderDash: [5, 5],
                        tension: 0.1
                    }
                ]
            };

            // 실제 데이터 추가
            if (analysis.data && analysis.data.statistics) {
                // 최근 5개 시험 데이터
                for (let i = 0; i < 5; i++) {
                    chartData.labels.push(`시험 ${i + 1}`);
                    chartData.datasets[0].data.push(
                        Math.random() * 30 + 60 // 실제 데이터로 교체 필요
                    );
                }

                // 예측 데이터 추가
                if (analysis.data.prediction.available) {
                    chartData.labels.push('다음 예측');
                    chartData.datasets[1].data = [
                        ...chartData.datasets[0].data.slice(-2),
                        parseFloat(analysis.data.prediction.nextExam.predicted)
                    ];
                }
            }

            res.json({
                success: true,
                data: chartData
            });
        } catch (error) {
            console.error('예측 차트 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * 강점/약점 레이더 차트 데이터
     */
    async getStrengthsChart(req, res) {
        try {
            const academyId = req.academyId;
            const { studentId } = req.params;

            const analysis = await AIAnalysisService.analyzeStudentPerformance(
                academyId,
                parseInt(studentId)
            );

            // Radar 차트 형식으로 데이터 변환
            const chartData = {
                labels: [],
                datasets: [{
                    label: '학생 성적',
                    data: [],
                    fill: true,
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgb(54, 162, 235)',
                    pointBackgroundColor: 'rgb(54, 162, 235)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgb(54, 162, 235)'
                }]
            };

            if (analysis.data && analysis.data.strengthsWeaknesses.subjectDetails) {
                Object.entries(analysis.data.strengthsWeaknesses.subjectDetails).forEach(([subject, details]) => {
                    chartData.labels.push(subject);
                    chartData.datasets[0].data.push(details.average);
                });
            }

            res.json({
                success: true,
                data: chartData
            });
        } catch (error) {
            console.error('강점 차트 오류:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = new AIAnalysisController();