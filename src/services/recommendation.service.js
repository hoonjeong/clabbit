/**
 * 맞춤형 학습 추천 서비스
 * AI 분석 결과를 기반으로 개인화된 학습 전략 제공
 */

const AIAnalysisService = require('./ai-analysis.service');
const StudentScoreModel = require('../models/student-score.model');
const StudentModel = require('../models/student.model');

class RecommendationService {
    /**
     * 개인 맞춤형 학습 계획 생성
     * @param {number} academyId - 학원 ID
     * @param {number} studentId - 학생 ID
     * @returns {Promise<Object>} 학습 계획
     */
    async generateStudyPlan(academyId, studentId) {
        try {
            // AI 분석 결과 활용
            const aiAnalysis = await AIAnalysisService.analyzeStudentPerformance(academyId, studentId);
            const { statistics, strengthsWeaknesses, prediction, aiInsights } = aiAnalysis.data;

            // 학습 계획 생성
            const studyPlan = {
                weekly: this.createWeeklyPlan(strengthsWeaknesses, aiInsights),
                daily: this.createDailySchedule(strengthsWeaknesses),
                focus: this.identifyFocusAreas(strengthsWeaknesses, prediction),
                milestones: this.createMilestones(statistics, prediction),
                resources: this.recommendResources(strengthsWeaknesses)
            };

            return {
                success: true,
                data: studyPlan
            };
        } catch (error) {
            console.error('학습 계획 생성 오류:', error);
            throw error;
        }
    }

    /**
     * 주간 학습 계획 생성
     */
    createWeeklyPlan(strengthsWeaknesses, aiInsights) {
        const plan = {
            monday: [],
            tuesday: [],
            wednesday: [],
            thursday: [],
            friday: [],
            saturday: [],
            sunday: []
        };

        // 약점 과목 집중 배치
        const weakSubjects = strengthsWeaknesses.weaknesses || [];
        const strongSubjects = strengthsWeaknesses.strengths || [];

        // 월/수/금 - 약점 과목 집중
        weakSubjects.forEach((subject, index) => {
            if (index % 3 === 0) {
                plan.monday.push({
                    subject: subject.subject,
                    duration: '90분',
                    type: '집중 학습',
                    content: '기초 개념 복습 및 문제 풀이'
                });
                plan.wednesday.push({
                    subject: subject.subject,
                    duration: '60분',
                    type: '복습',
                    content: '오답 정리 및 유사 문제'
                });
                plan.friday.push({
                    subject: subject.subject,
                    duration: '90분',
                    type: '심화 학습',
                    content: '응용 문제 및 실전 연습'
                });
            }
        });

        // 화/목 - 강점 과목 유지
        strongSubjects.forEach((subject, index) => {
            if (index < 2) {
                const day = index === 0 ? 'tuesday' : 'thursday';
                plan[day].push({
                    subject: subject.subject,
                    duration: '60분',
                    type: '유지 학습',
                    content: '고난도 문제 도전'
                });
            }
        });

        // 토요일 - 종합 복습
        plan.saturday.push({
            subject: '전 과목',
            duration: '180분',
            type: '모의고사',
            content: '실전 모의고사 및 분석'
        });

        // 일요일 - 자율 학습
        plan.sunday.push({
            subject: '자율 선택',
            duration: '120분',
            type: '자기주도 학습',
            content: '관심 분야 탐구 또는 부족한 부분 보충'
        });

        // AI 인사이트 반영
        if (aiInsights && aiInsights.strategies) {
            aiInsights.strategies.forEach((strategy, index) => {
                const days = Object.keys(plan);
                const targetDay = days[index % days.length];
                plan[targetDay].push({
                    subject: 'AI 추천',
                    duration: '30분',
                    type: '특별 활동',
                    content: strategy
                });
            });
        }

        return plan;
    }

    /**
     * 일일 학습 스케줄 생성
     */
    createDailySchedule(strengthsWeaknesses) {
        const schedule = {
            morning: {
                time: '07:00 - 08:00',
                activity: '영어 단어 암기',
                detail: '신규 단어 20개 + 복습 30개',
                tips: '아침 시간은 암기에 최적'
            },
            afterSchool: {
                time: '16:00 - 18:00',
                activity: '학원 수업',
                detail: '정규 수업 참여',
                tips: '수업 내용 완벽 이해에 집중'
            },
            evening1: {
                time: '19:00 - 20:30',
                activity: '숙제 및 복습',
                detail: '당일 학습 내용 정리',
                tips: '이해하지 못한 부분 표시'
            },
            evening2: {
                time: '20:30 - 22:00',
                activity: '약점 보완',
                detail: strengthsWeaknesses.weaknesses.length > 0 ?
                    `${strengthsWeaknesses.weaknesses[0].subject} 집중 학습` :
                    '자율 학습',
                tips: '가장 어려운 과목부터 시작'
            },
            beforeSleep: {
                time: '22:00 - 22:30',
                activity: '하루 정리',
                detail: '오늘 배운 내용 간단 복습',
                tips: '수면 전 복습은 기억력 향상에 도움'
            }
        };

        return schedule;
    }

    /**
     * 집중 영역 식별
     */
    identifyFocusAreas(strengthsWeaknesses, prediction) {
        const focusAreas = [];

        // 약점 과목 우선순위
        strengthsWeaknesses.weaknesses.forEach(weakness => {
            focusAreas.push({
                subject: weakness.subject,
                priority: 'high',
                reason: `현재 평균 ${weakness.average}점으로 개선 필요`,
                targetImprovement: '10점',
                strategy: '기초부터 차근차근 복습'
            });
        });

        // 예측 기반 추가 집중 영역
        if (prediction.available && prediction.nextExam) {
            if (parseFloat(prediction.nextExam.predicted) < 70) {
                focusAreas.push({
                    subject: '전반적 학습',
                    priority: 'critical',
                    reason: `다음 시험 예측 점수 ${prediction.nextExam.predicted}점`,
                    targetImprovement: '긴급 개선',
                    strategy: '집중 특별 관리 필요'
                });
            }
        }

        // 영역별 세부 분석
        if (strengthsWeaknesses.subjectDetails) {
            Object.entries(strengthsWeaknesses.subjectDetails).forEach(([subject, details]) => {
                if (details.areas) {
                    Object.entries(details.areas).forEach(([area, areaData]) => {
                        if (areaData.average < 60) {
                            focusAreas.push({
                                subject: `${subject} - ${area}`,
                                priority: 'medium',
                                reason: `${area} 영역 평균 ${areaData.average.toFixed(1)}점`,
                                targetImprovement: '15점',
                                strategy: `${area} 전문 교재 활용`
                            });
                        }
                    });
                }
            });
        }

        return focusAreas.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
    }

    /**
     * 학습 마일스톤 생성
     */
    createMilestones(statistics, prediction) {
        const currentAverage = statistics.mean;
        const milestones = [];

        // 1주차 목표
        milestones.push({
            week: 1,
            goal: '기초 다지기',
            targetScore: currentAverage + 2,
            tasks: [
                '매일 2시간 이상 학습',
                '오답 노트 작성 시작',
                '약점 과목 기초 문제집 50% 완료'
            ],
            checkPoint: '주말 자체 평가'
        });

        // 2-3주차 목표
        milestones.push({
            week: 2,
            goal: '실력 향상',
            targetScore: currentAverage + 5,
            tasks: [
                '심화 문제 도전',
                '모의고사 2회 실시',
                '약점 과목 평균 5점 상승'
            ],
            checkPoint: '교사 상담'
        });

        // 4주차 목표
        milestones.push({
            week: 4,
            goal: '목표 달성',
            targetScore: Math.min(currentAverage + 10, 90),
            tasks: [
                '전 과목 목표 점수 달성',
                '자신감 회복',
                '다음 단계 계획 수립'
            ],
            checkPoint: '종합 평가 및 피드백'
        });

        // 예측 기반 조정
        if (prediction.available && prediction.nextExam) {
            const predictedScore = parseFloat(prediction.nextExam.predicted);
            if (predictedScore < currentAverage) {
                milestones[0].urgency = 'high';
                milestones[0].additionalSupport = '즉시 보충 수업 필요';
            }
        }

        return milestones;
    }

    /**
     * 학습 자료 추천
     */
    recommendResources(strengthsWeaknesses) {
        const resources = {
            textbooks: [],
            online: [],
            apps: [],
            videos: []
        };

        // 교재 추천
        strengthsWeaknesses.weaknesses.forEach(weakness => {
            resources.textbooks.push({
                subject: weakness.subject,
                title: `${weakness.subject} 기초 완성`,
                publisher: 'EBS',
                level: '기초',
                estimatedTime: '4주 완독'
            });
        });

        // 온라인 자료
        resources.online = [
            {
                platform: 'EBS 온라인 클래스',
                url: 'https://www.ebs.co.kr',
                type: '무료 강의',
                subjects: '전 과목'
            },
            {
                platform: '칸아카데미',
                url: 'https://ko.khanacademy.org',
                type: '개념 학습',
                subjects: '수학, 과학'
            },
            {
                platform: '메가스터디',
                url: 'https://www.megastudy.net',
                type: '인터넷 강의',
                subjects: '전 과목'
            }
        ];

        // 학습 앱 추천
        resources.apps = [
            {
                name: '암기고래',
                platform: 'iOS/Android',
                purpose: '영어 단어 암기',
                features: '게임형 학습'
            },
            {
                name: '수학대왕',
                platform: 'iOS/Android',
                purpose: '수학 문제 풀이',
                features: 'AI 오답 분석'
            },
            {
                name: '공부타이머',
                platform: 'iOS/Android',
                purpose: '학습 시간 관리',
                features: '뽀모도로 기법'
            }
        ];

        // 동영상 강의
        resources.videos = [
            {
                channel: 'EBS 중학',
                platform: 'YouTube',
                subjects: '전 과목 개념 설명',
                duration: '15-30분/강의'
            },
            {
                channel: '수학의 신',
                platform: 'YouTube',
                subjects: '수학 문제 풀이',
                duration: '10-20분/강의'
            }
        ];

        return resources;
    }

    /**
     * 학습 습관 개선 제안
     */
    async suggestHabitImprovements(academyId, studentId) {
        try {
            const scores = await StudentScoreModel.getStudentScores(academyId, studentId);
            const patterns = await AIAnalysisService.predictLearningPattern(academyId, studentId);

            const suggestions = {
                timeManagement: [],
                studyMethods: [],
                environment: [],
                health: []
            };

            // 시간 관리
            suggestions.timeManagement = [
                {
                    habit: '일정한 학습 시간',
                    current: patterns.data.patterns.consistency,
                    recommendation: '매일 같은 시간에 2시간씩 학습',
                    benefit: '생체 리듬 최적화로 집중력 향상'
                },
                {
                    habit: '짧은 휴식',
                    recommendation: '50분 학습 후 10분 휴식',
                    benefit: '피로도 감소 및 장기 집중력 유지'
                }
            ];

            // 학습 방법
            suggestions.studyMethods = [
                {
                    method: '능동적 학습',
                    description: '읽기만 하지 말고 직접 문제 만들기',
                    application: '배운 내용으로 3문제씩 출제'
                },
                {
                    method: '분산 학습',
                    description: '한 과목 몰아서 하지 말고 번갈아 학습',
                    application: '하루 3과목 이상 균형있게'
                }
            ];

            // 학습 환경
            suggestions.environment = [
                {
                    factor: '조명',
                    recommendation: '밝은 백색 조명 사용',
                    reason: '눈의 피로 감소'
                },
                {
                    factor: '소음',
                    recommendation: '백색 소음 또는 완전 정숙',
                    reason: '집중력 최대화'
                }
            ];

            // 건강 관리
            suggestions.health = [
                {
                    aspect: '수면',
                    recommendation: '최소 7시간 수면',
                    impact: '기억력 30% 향상'
                },
                {
                    aspect: '운동',
                    recommendation: '주 3회 30분 유산소 운동',
                    impact: '뇌 혈류 증가로 학습 효율 상승'
                }
            ];

            return {
                success: true,
                data: suggestions
            };
        } catch (error) {
            console.error('습관 개선 제안 오류:', error);
            throw error;
        }
    }

    /**
     * 동기부여 콘텐츠 생성
     */
    async generateMotivationalContent(academyId, studentId) {
        try {
            const student = await StudentModel.findById(academyId, studentId);
            const aiAnalysis = await AIAnalysisService.analyzeStudentPerformance(academyId, studentId);

            const content = {
                dailyQuote: this.getDailyQuote(),
                personalMessage: aiAnalysis.data.aiInsights?.motivation || '당신의 노력이 빛날 날이 곧 올 것입니다!',
                achievements: this.identifyRecentAchievements(aiAnalysis.data),
                challenges: this.createDailyChallenges(aiAnalysis.data.strengthsWeaknesses),
                rewards: this.suggestRewards(aiAnalysis.data.statistics)
            };

            return {
                success: true,
                data: content
            };
        } catch (error) {
            console.error('동기부여 콘텐츠 생성 오류:', error);
            throw error;
        }
    }

    /**
     * 일일 명언
     */
    getDailyQuote() {
        const quotes = [
            { text: '천 리 길도 한 걸음부터', author: '중국 속담' },
            { text: '노력은 배신하지 않는다', author: '한국 속담' },
            { text: '오늘의 실패는 내일의 성공의 밑거름', author: '에디슨' },
            { text: '포기하지 않으면 실패는 없다', author: '마쓰시타 고노스케' },
            { text: '꿈을 이루고자 하는 용기가 있다면 모든 꿈을 이룰 수 있다', author: '월트 디즈니' }
        ];

        const today = new Date().getDate();
        return quotes[today % quotes.length];
    }

    /**
     * 최근 성취 식별
     */
    identifyRecentAchievements(analysisData) {
        const achievements = [];

        if (analysisData.statistics.improvement > 0) {
            achievements.push({
                type: 'improvement',
                description: `성적이 ${analysisData.statistics.improvement.toFixed(1)}점 향상되었습니다!`,
                icon: '🎯'
            });
        }

        if (analysisData.statistics.recentAverage > analysisData.statistics.mean) {
            achievements.push({
                type: 'trend',
                description: '최근 성적이 상승 추세입니다!',
                icon: '📈'
            });
        }

        if (analysisData.strengthsWeaknesses.strengths.length > 0) {
            achievements.push({
                type: 'strength',
                description: `${analysisData.strengthsWeaknesses.strengths[0].subject}에서 우수한 성적을 유지중입니다!`,
                icon: '⭐'
            });
        }

        return achievements;
    }

    /**
     * 일일 도전 과제 생성
     */
    createDailyChallenges(strengthsWeaknesses) {
        const challenges = [];

        if (strengthsWeaknesses.weaknesses.length > 0) {
            challenges.push({
                title: '약점 극복 챌린지',
                task: `${strengthsWeaknesses.weaknesses[0].subject} 문제 10개 풀기`,
                reward: '완료 시 보너스 포인트 100점',
                difficulty: 'medium'
            });
        }

        challenges.push({
            title: '완벽한 하루',
            task: '오늘 계획한 학습 100% 완료하기',
            reward: '주말 자유 시간 1시간 추가',
            difficulty: 'hard'
        });

        challenges.push({
            title: '복습의 달인',
            task: '어제 배운 내용 완벽하게 설명하기',
            reward: '좋아하는 간식',
            difficulty: 'easy'
        });

        return challenges;
    }

    /**
     * 보상 제안
     */
    suggestRewards(statistics) {
        const rewards = {
            shortTerm: [],
            longTerm: []
        };

        // 단기 보상
        rewards.shortTerm = [
            {
                condition: '일일 목표 달성',
                reward: '좋아하는 유튜브 30분'
            },
            {
                condition: '주간 목표 달성',
                reward: '주말 영화 관람'
            }
        ];

        // 장기 보상
        rewards.longTerm = [
            {
                condition: '월간 목표 달성',
                reward: '원하는 선물 (3만원 이내)'
            },
            {
                condition: `평균 ${Math.ceil(statistics.mean + 10)}점 달성`,
                reward: '가족 외식'
            }
        ];

        return rewards;
    }

    /**
     * 학부모 리포트 생성
     */
    async generateParentReport(academyId, studentId) {
        try {
            const student = await StudentModel.findById(academyId, studentId);
            const aiAnalysis = await AIAnalysisService.analyzeStudentPerformance(academyId, studentId);
            const studyPlan = await this.generateStudyPlan(academyId, studentId);

            const report = {
                summary: {
                    studentName: student.name,
                    currentAverage: aiAnalysis.data.statistics.mean.toFixed(1),
                    trend: aiAnalysis.data.trend.trend,
                    lastUpdated: new Date()
                },
                performance: {
                    strengths: aiAnalysis.data.strengthsWeaknesses.strengths,
                    weaknesses: aiAnalysis.data.strengthsWeaknesses.weaknesses,
                    prediction: aiAnalysis.data.prediction
                },
                recommendations: {
                    immediate: aiAnalysis.data.recommendations.immediate,
                    parentAction: aiAnalysis.data.aiInsights?.parentConsultation || []
                },
                studyPlan: {
                    weekly: studyPlan.data.weekly,
                    milestones: studyPlan.data.milestones
                },
                supportNeeded: this.identifyParentSupport(aiAnalysis.data)
            };

            return {
                success: true,
                data: report
            };
        } catch (error) {
            console.error('학부모 리포트 생성 오류:', error);
            throw error;
        }
    }

    /**
     * 학부모 지원 필요사항 식별
     */
    identifyParentSupport(analysisData) {
        const support = [];

        if (analysisData.statistics.mean < 60) {
            support.push({
                type: 'urgent',
                area: '학습 지원',
                action: '전문 상담 및 보충 수업 고려',
                reason: '현재 평균 점수가 낮음'
            });
        }

        if (analysisData.trend.trend === 'declining') {
            support.push({
                type: 'attention',
                area: '동기부여',
                action: '긍정적 격려와 작은 목표 설정',
                reason: '최근 성적 하락 추세'
            });
        }

        support.push({
            type: 'regular',
            area: '학습 환경',
            action: '조용한 학습 공간 제공',
            reason: '집중력 향상에 필수'
        });

        support.push({
            type: 'regular',
            area: '건강 관리',
            action: '규칙적인 수면과 영양 관리',
            reason: '학습 효율성과 직결'
        });

        return support;
    }
}

module.exports = new RecommendationService();