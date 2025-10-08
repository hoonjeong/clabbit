/**
 * AI 기반 성적 분석 및 예측 서비스
 * Google Gemini AI와 머신러닝 알고리즘을 활용한 학습 분석
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const brain = require('brain.js');
const ss = require('simple-statistics');
const MLRegression = require('ml-regression');
const StudentScoreModel = require('../models/student-score.model');
const StudentModel = require('../models/student.model');
const ConsultationModel = require('../models/consultation.model');

class AIAnalysisService {
    constructor() {
        // Gemini AI 초기화
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[AIAnalysisService] GEMINI_API_KEY is not set in environment variables');
            throw new Error('GEMINI_API_KEY is required for AI Analysis Service');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        // 신경망 초기화 (성적 예측용)
        this.scorePredictor = new brain.NeuralNetwork({
            hiddenLayers: [10, 10],
            activation: 'sigmoid'
        });

        this.isModelTrained = false;
    }

    /**
     * 학생 성적 종합 분석
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @returns {Promise<Object>} 종합 분석 결과
     */
    async analyzeStudentPerformance(academyId, studentId) {
        try {
            // 1. 학생 정보 및 성적 데이터 수집
            const student = await StudentModel.findById(academyId, studentId);
            const scores = await StudentScoreModel.getStudentScores(academyId, studentId);
            const recentConsultations = await ConsultationModel.getByStudent(academyId, studentId, { limit: 5 });

            // 2. 기본 통계 분석
            const basicStats = this.calculateBasicStatistics(scores);

            // 3. 성적 추이 분석
            const trendAnalysis = this.analyzeTrend(scores);

            // 4. 머신러닝 기반 성적 예측
            const prediction = await this.predictFutureScores(scores);

            // 5. 강점/약점 분석
            const strengthsWeaknesses = this.analyzeStrengthsWeaknesses(scores);

            // 6. Gemini AI를 통한 심층 분석
            const aiInsights = await this.getGeminiInsights({
                student,
                scores,
                consultations: recentConsultations,
                basicStats,
                trendAnalysis,
                strengthsWeaknesses
            });

            // 7. 맞춤형 학습 추천
            const recommendations = await this.generateRecommendations({
                student,
                scores,
                aiInsights,
                strengthsWeaknesses
            });

            return {
                success: true,
                data: {
                    student: {
                        id: student.id,
                        name: student.name,
                        grade: student.grade,
                        school: student.school
                    },
                    statistics: basicStats,
                    trend: trendAnalysis,
                    prediction,
                    strengthsWeaknesses,
                    aiInsights,
                    recommendations,
                    generatedAt: new Date()
                }
            };
        } catch (error) {
            console.error('AI 분석 오류:', error);
            throw error;
        }
    }

    /**
     * 기본 통계 계산
     */
    calculateBasicStatistics(scores) {
        if (!scores || scores.length === 0) {
            return {
                mean: 0,
                median: 0,
                mode: 0,
                standardDeviation: 0,
                variance: 0,
                range: 0,
                percentile: {}
            };
        }

        const scoreValues = scores.map(s => s.percentage || 0);

        return {
            mean: ss.mean(scoreValues),
            median: ss.median(scoreValues),
            mode: ss.mode(scoreValues),
            standardDeviation: ss.standardDeviation(scoreValues),
            variance: ss.variance(scoreValues),
            range: ss.max(scoreValues) - ss.min(scoreValues),
            percentile: {
                25: ss.quantile(scoreValues, 0.25),
                50: ss.quantile(scoreValues, 0.50),
                75: ss.quantile(scoreValues, 0.75),
                90: ss.quantile(scoreValues, 0.90)
            },
            recentAverage: ss.mean(scoreValues.slice(-5)), // 최근 5개 평균
            improvement: scoreValues.length >= 2 ?
                scoreValues[scoreValues.length - 1] - scoreValues[0] : 0
        };
    }

    /**
     * 성적 추이 분석
     */
    analyzeTrend(scores) {
        if (!scores || scores.length < 2) {
            return { trend: 'insufficient_data', confidence: 0 };
        }

        const scoreData = scores.map((s, index) => ({
            x: index,
            y: s.percentage || 0
        }));

        // 선형 회귀 분석
        const regression = new MLRegression.SLR(
            scoreData.map(d => d.x),
            scoreData.map(d => d.y)
        );

        const slope = regression.slope;
        const r2 = regression.r2;

        let trend = 'stable';
        if (slope > 2) trend = 'improving';
        else if (slope > 0.5) trend = 'slightly_improving';
        else if (slope < -2) trend = 'declining';
        else if (slope < -0.5) trend = 'slightly_declining';

        // 변동성 계산
        const volatility = ss.standardDeviation(scoreData.map(d => d.y));

        return {
            trend,
            slope: slope.toFixed(2),
            confidence: (r2 * 100).toFixed(1),
            volatility: volatility.toFixed(2),
            prediction: {
                next: regression.predict(scores.length).toFixed(1),
                nextThree: regression.predict(scores.length + 2).toFixed(1)
            }
        };
    }

    /**
     * 머신러닝 기반 성적 예측
     */
    async predictFutureScores(scores) {
        if (scores.length < 3) {
            return {
                available: false,
                message: '예측을 위해 최소 3개 이상의 시험 데이터가 필요합니다.'
            };
        }

        // 훈련 데이터 준비
        const trainingData = [];
        for (let i = 2; i < scores.length; i++) {
            trainingData.push({
                input: {
                    prev1: scores[i - 1].percentage / 100,
                    prev2: scores[i - 2].percentage / 100,
                    trend: (scores[i - 1].percentage - scores[i - 2].percentage) / 100
                },
                output: {
                    score: scores[i].percentage / 100
                }
            });
        }

        if (trainingData.length > 0) {
            // 신경망 훈련
            await this.scorePredictor.train(trainingData, {
                iterations: 2000,
                errorThresh: 0.005
            });
            this.isModelTrained = true;

            // 예측
            const lastTwo = scores.slice(-2);
            const predictionInput = {
                prev1: lastTwo[1].percentage / 100,
                prev2: lastTwo[0].percentage / 100,
                trend: (lastTwo[1].percentage - lastTwo[0].percentage) / 100
            };

            const prediction = this.scorePredictor.run(predictionInput);
            const predictedScore = prediction.score * 100;

            return {
                available: true,
                nextExam: {
                    predicted: predictedScore.toFixed(1),
                    confidence: this.calculatePredictionConfidence(scores, predictedScore),
                    range: {
                        min: Math.max(0, predictedScore - 10).toFixed(1),
                        max: Math.min(100, predictedScore + 10).toFixed(1)
                    }
                },
                recommendation: this.getPredictionRecommendation(predictedScore, scores[scores.length - 1].percentage)
            };
        }

        return {
            available: false,
            message: '예측 모델 훈련에 실패했습니다.'
        };
    }

    /**
     * 예측 신뢰도 계산
     */
    calculatePredictionConfidence(scores, predicted) {
        const recentScores = scores.slice(-5).map(s => s.percentage);
        const variance = ss.variance(recentScores);

        // 변동성이 낮을수록 신뢰도가 높음
        let confidence = Math.max(0, 100 - variance);

        // 데이터가 많을수록 신뢰도 증가
        confidence += Math.min(20, scores.length * 2);

        return Math.min(95, confidence).toFixed(1);
    }

    /**
     * 예측 기반 추천
     */
    getPredictionRecommendation(predicted, current) {
        const diff = predicted - current;

        if (diff > 5) {
            return '성적이 상승할 것으로 예측됩니다. 현재 학습 패턴을 유지하세요.';
        } else if (diff < -5) {
            return '성적 하락이 예상됩니다. 학습 방법 개선이 필요합니다.';
        } else {
            return '안정적인 성적을 유지할 것으로 예상됩니다.';
        }
    }

    /**
     * 강점/약점 분석
     */
    analyzeStrengthsWeaknesses(scores) {
        const subjectAnalysis = {};

        // 과목별/영역별 그룹화
        scores.forEach(score => {
            const subject = score.subject_name || '전체';
            if (!subjectAnalysis[subject]) {
                subjectAnalysis[subject] = {
                    scores: [],
                    average: 0,
                    trend: 'stable',
                    areas: {}
                };
            }

            subjectAnalysis[subject].scores.push(score.percentage);

            // 영역별 분석 (문법, 독해, 어휘 등)
            if (score.area_scores) {
                Object.entries(score.area_scores).forEach(([area, areaScore]) => {
                    if (!subjectAnalysis[subject].areas[area]) {
                        subjectAnalysis[subject].areas[area] = [];
                    }
                    subjectAnalysis[subject].areas[area].push(areaScore);
                });
            }
        });

        // 평균 및 추세 계산
        Object.keys(subjectAnalysis).forEach(subject => {
            const analysis = subjectAnalysis[subject];
            analysis.average = ss.mean(analysis.scores);

            if (analysis.scores.length >= 2) {
                const recent = analysis.scores.slice(-3);
                const older = analysis.scores.slice(-6, -3);
                if (older.length > 0) {
                    const recentAvg = ss.mean(recent);
                    const olderAvg = ss.mean(older);
                    if (recentAvg - olderAvg > 5) analysis.trend = 'improving';
                    else if (olderAvg - recentAvg > 5) analysis.trend = 'declining';
                }
            }

            // 영역별 평균
            Object.keys(analysis.areas).forEach(area => {
                analysis.areas[area] = {
                    average: ss.mean(analysis.areas[area]),
                    scores: analysis.areas[area]
                };
            });
        });

        // 강점과 약점 도출
        const allAverages = Object.values(subjectAnalysis).map(s => s.average);
        const overallAverage = ss.mean(allAverages);

        const strengths = [];
        const weaknesses = [];
        const opportunities = [];

        Object.entries(subjectAnalysis).forEach(([subject, analysis]) => {
            if (analysis.average > overallAverage + 10) {
                strengths.push({
                    subject,
                    average: analysis.average.toFixed(1),
                    trend: analysis.trend
                });
            } else if (analysis.average < overallAverage - 10) {
                weaknesses.push({
                    subject,
                    average: analysis.average.toFixed(1),
                    trend: analysis.trend
                });
            }

            if (analysis.trend === 'improving') {
                opportunities.push({
                    subject,
                    reason: '최근 상승 추세'
                });
            }
        });

        return {
            strengths,
            weaknesses,
            opportunities,
            subjectDetails: subjectAnalysis,
            overallAverage: overallAverage.toFixed(1)
        };
    }

    /**
     * Gemini AI를 통한 심층 분석
     */
    async getGeminiInsights(data) {
        try {
            const prompt = `
한국 학원 학생의 학습 데이터를 분석해주세요.

학생 정보:
- 이름: ${data.student.name}
- 학년: ${data.student.grade}
- 학교: ${data.student.school}

성적 통계:
- 평균 점수: ${data.basicStats.mean.toFixed(1)}점
- 최근 평균: ${data.basicStats.recentAverage.toFixed(1)}점
- 표준편차: ${data.basicStats.standardDeviation.toFixed(1)}
- 성적 추이: ${data.trendAnalysis.trend}

강점 과목: ${data.strengthsWeaknesses.strengths.map(s => s.subject).join(', ') || '없음'}
약점 과목: ${data.strengthsWeaknesses.weaknesses.map(w => w.subject).join(', ') || '없음'}

최근 상담 내용:
${data.consultations.slice(0, 3).map(c => c.consultation_content).join('\n') || '없음'}

다음 항목에 대해 구체적이고 실용적인 분석을 제공해주세요:
1. 학습 패턴 분석 (200자)
2. 개선이 필요한 구체적 영역 (3가지)
3. 맞춤형 학습 전략 (3가지)
4. 동기부여 메시지 (100자)
5. 학부모 상담 권고사항 (2가지)

JSON 형식으로 응답해주세요.`;

            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // JSON 파싱 시도
            try {
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                console.error('JSON 파싱 실패:', parseError);
            }

            // 파싱 실패 시 기본 구조 반환
            return {
                learningPattern: text.substring(0, 200),
                improvementAreas: [
                    '기초 개념 강화 필요',
                    '문제 풀이 속도 개선',
                    '오답 노트 작성 습관화'
                ],
                strategies: [
                    '매일 30분 복습 시간 확보',
                    '취약 단원 집중 학습',
                    '동료 학습 그룹 참여'
                ],
                motivation: '꾸준한 노력이 큰 성과를 만듭니다. 작은 진전도 의미있는 성장입니다.',
                parentConsultation: [
                    '가정에서의 학습 환경 점검',
                    '긍정적 피드백과 격려 제공'
                ]
            };
        } catch (error) {
            console.error('Gemini AI 분석 오류:', error);
            return {
                learningPattern: '데이터 분석 중',
                improvementAreas: ['추가 분석 필요'],
                strategies: ['기본 학습 전략 적용'],
                motivation: '계속 노력하세요!',
                parentConsultation: ['정기 상담 권장']
            };
        }
    }

    /**
     * 맞춤형 학습 추천 생성
     */
    async generateRecommendations(data) {
        const recommendations = {
            immediate: [],
            shortTerm: [],
            longTerm: [],
            resources: []
        };

        // 즉시 실행 가능한 추천
        if (data.strengthsWeaknesses.weaknesses.length > 0) {
            recommendations.immediate.push({
                action: '취약 과목 보강',
                detail: `${data.strengthsWeaknesses.weaknesses[0].subject} 기초 개념 복습`,
                priority: 'high',
                estimatedTime: '매일 30분'
            });
        }

        // 단기 목표 (1개월)
        recommendations.shortTerm.push({
            goal: '성적 5% 향상',
            method: '일일 학습 계획 수립 및 실행',
            milestone: '주간 모의고사 실시'
        });

        // 장기 목표 (3개월)
        recommendations.longTerm.push({
            goal: '전 과목 평균 80점 이상',
            method: '체계적인 학습 관리 시스템 구축',
            milestone: '월별 성취도 평가'
        });

        // AI 인사이트 기반 추천
        if (data.aiInsights && data.aiInsights.strategies) {
            data.aiInsights.strategies.forEach(strategy => {
                recommendations.immediate.push({
                    action: strategy,
                    priority: 'medium',
                    source: 'AI 분석'
                });
            });
        }

        // 학습 자료 추천
        recommendations.resources = [
            {
                type: 'workbook',
                title: '기초 개념 완성 문제집',
                subject: data.strengthsWeaknesses.weaknesses[0]?.subject || '전과목'
            },
            {
                type: 'online',
                title: 'EBS 온라인 클래스',
                url: 'https://www.ebs.co.kr'
            },
            {
                type: 'app',
                title: '매일 10분 영단어',
                platform: 'mobile'
            }
        ];

        return recommendations;
    }

    /**
     * 학급 전체 분석
     */
    async analyzeClassPerformance(academyId, classId) {
        try {
            // 학급 학생들의 성적 데이터 수집
            const students = await StudentModel.findByClass(academyId, classId);
            const classAnalysis = {
                totalStudents: students.length,
                averageScore: 0,
                distribution: {},
                topPerformers: [],
                needsAttention: [],
                trends: []
            };

            const allScores = [];
            for (const student of students) {
                const scores = await StudentScoreModel.getStudentScores(academyId, student.id);
                if (scores.length > 0) {
                    const avgScore = ss.mean(scores.map(s => s.percentage));
                    allScores.push({
                        studentId: student.id,
                        studentName: student.name,
                        average: avgScore
                    });
                }
            }

            // 성적 분포 분석
            classAnalysis.averageScore = ss.mean(allScores.map(s => s.average));

            // 상위/하위 학생 식별
            allScores.sort((a, b) => b.average - a.average);
            classAnalysis.topPerformers = allScores.slice(0, 5);
            classAnalysis.needsAttention = allScores.slice(-5);

            // 분포도
            classAnalysis.distribution = {
                '90-100': allScores.filter(s => s.average >= 90).length,
                '80-89': allScores.filter(s => s.average >= 80 && s.average < 90).length,
                '70-79': allScores.filter(s => s.average >= 70 && s.average < 80).length,
                '60-69': allScores.filter(s => s.average >= 60 && s.average < 70).length,
                'below60': allScores.filter(s => s.average < 60).length
            };

            return {
                success: true,
                data: classAnalysis
            };
        } catch (error) {
            console.error('학급 분석 오류:', error);
            throw error;
        }
    }

    /**
     * 학습 패턴 예측
     */
    async predictLearningPattern(academyId, studentId, period = 30) {
        try {
            const scores = await StudentScoreModel.getStudentScores(academyId, studentId);
            const consultations = await ConsultationModel.getByStudent(academyId, studentId);

            // 학습 패턴 특징 추출
            const patterns = {
                consistency: this.calculateConsistency(scores),
                studyHabits: this.analyzeStudyHabits(consultations),
                performanceCycles: this.identifyPerformanceCycles(scores),
                stressFactors: this.identifyStressFactors(scores, consultations)
            };

            // Gemini AI를 통한 패턴 해석
            const interpretation = await this.interpretPatterns(patterns);

            return {
                success: true,
                data: {
                    patterns,
                    interpretation,
                    recommendations: this.generatePatternBasedRecommendations(patterns)
                }
            };
        } catch (error) {
            console.error('학습 패턴 예측 오류:', error);
            throw error;
        }
    }

    /**
     * 일관성 계산
     */
    calculateConsistency(scores) {
        if (scores.length < 3) return 'insufficient_data';

        const variations = [];
        for (let i = 1; i < scores.length; i++) {
            variations.push(Math.abs(scores[i].percentage - scores[i-1].percentage));
        }

        const avgVariation = ss.mean(variations);

        if (avgVariation < 5) return 'highly_consistent';
        if (avgVariation < 10) return 'consistent';
        if (avgVariation < 15) return 'moderate';
        return 'inconsistent';
    }

    /**
     * 학습 습관 분석
     */
    analyzeStudyHabits(consultations) {
        const habits = {
            regularity: 'unknown',
            focus: 'unknown',
            motivation: 'unknown'
        };

        // 상담 내용에서 키워드 추출
        const content = consultations.map(c => c.consultation_content).join(' ');

        if (content.includes('꾸준') || content.includes('규칙적')) {
            habits.regularity = 'good';
        }
        if (content.includes('집중') && !content.includes('집중력 부족')) {
            habits.focus = 'good';
        }
        if (content.includes('의욕') || content.includes('열정')) {
            habits.motivation = 'high';
        }

        return habits;
    }

    /**
     * 성과 주기 식별
     */
    identifyPerformanceCycles(scores) {
        if (scores.length < 6) return null;

        // 고점과 저점 찾기
        const peaks = [];
        const valleys = [];

        for (let i = 1; i < scores.length - 1; i++) {
            if (scores[i].percentage > scores[i-1].percentage &&
                scores[i].percentage > scores[i+1].percentage) {
                peaks.push(i);
            }
            if (scores[i].percentage < scores[i-1].percentage &&
                scores[i].percentage < scores[i+1].percentage) {
                valleys.push(i);
            }
        }

        return {
            peaks,
            valleys,
            cycleLength: peaks.length > 1 ?
                Math.round(ss.mean(peaks.slice(1).map((p, i) => p - peaks[i]))) : null
        };
    }

    /**
     * 스트레스 요인 식별
     */
    identifyStressFactors(scores, consultations) {
        const factors = [];

        // 급격한 성적 하락 시점 찾기
        for (let i = 1; i < scores.length; i++) {
            if (scores[i].percentage < scores[i-1].percentage - 15) {
                factors.push({
                    type: 'sudden_drop',
                    date: scores[i].exam_date,
                    magnitude: scores[i-1].percentage - scores[i].percentage
                });
            }
        }

        return factors;
    }

    /**
     * 패턴 해석
     */
    async interpretPatterns(patterns) {
        const prompt = `
학습 패턴 데이터:
- 일관성: ${patterns.consistency}
- 학습 습관: ${JSON.stringify(patterns.studyHabits)}
- 성과 주기: ${patterns.performanceCycles ? `${patterns.performanceCycles.cycleLength}회` : '미확인'}

이 패턴이 의미하는 바와 개선 방향을 100자 이내로 설명해주세요.`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            return '패턴 분석 중입니다.';
        }
    }

    /**
     * 패턴 기반 추천 생성
     */
    generatePatternBasedRecommendations(patterns) {
        const recommendations = [];

        if (patterns.consistency === 'inconsistent') {
            recommendations.push({
                issue: '일관성 부족',
                solution: '규칙적인 학습 스케줄 수립',
                priority: 'high'
            });
        }

        if (patterns.studyHabits.focus === 'poor') {
            recommendations.push({
                issue: '집중력 문제',
                solution: '짧은 학습 세션과 충분한 휴식',
                priority: 'medium'
            });
        }

        if (patterns.performanceCycles && patterns.performanceCycles.valleys.length > 2) {
            recommendations.push({
                issue: '주기적 슬럼프',
                solution: '슬럼프 시기 예측 및 대비',
                priority: 'medium'
            });
        }

        return recommendations;
    }
}

module.exports = new AIAnalysisService();