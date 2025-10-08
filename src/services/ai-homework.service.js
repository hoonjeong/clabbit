/**
 * AI 숙제 도우미 서비스
 * Google Gemini AI를 활용한 숙제 도움 및 문제 생성
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const natural = require('natural');
const ss = require('simple-statistics');

class AIHomeworkService {
    constructor() {
        // Gemini AI 초기화
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('[AIHomeworkService] GEMINI_API_KEY is not set in environment variables');
            throw new Error('GEMINI_API_KEY is required for AI Homework Service');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

        // 자연어 처리 도구
        this.tokenizer = new natural.WordTokenizer();
        this.classifier = new natural.BayesClassifier();

        // 문제 유형 분류기 훈련
        this.trainClassifier();
    }

    /**
     * 문제 유형 분류기 훈련
     */
    trainClassifier() {
        // 수학 문제
        this.classifier.addDocument('일차방정식을 풀어라', 'math');
        this.classifier.addDocument('원의 넓이를 구하시오', 'math');
        this.classifier.addDocument('피타고라스 정리를 증명하시오', 'math');

        // 영어 문제
        this.classifier.addDocument('다음 문장을 영어로 번역하시오', 'english');
        this.classifier.addDocument('빈칸에 알맞은 단어를 쓰시오', 'english');
        this.classifier.addDocument('다음 지문을 읽고 질문에 답하시오', 'english');

        // 과학 문제
        this.classifier.addDocument('광합성의 과정을 설명하시오', 'science');
        this.classifier.addDocument('뉴턴의 운동 법칙을 서술하시오', 'science');
        this.classifier.addDocument('화학 반응식을 완성하시오', 'science');

        this.classifier.train();
    }

    /**
     * 문제 풀이 도움
     */
    async helpSolve(question, subject, gradeLevel) {
        try {
            const prompt = `
당신은 친절한 학습 도우미입니다. 학생이 문제를 스스로 풀 수 있도록 힌트와 단계별 가이드를 제공해주세요.

**학년**: ${gradeLevel}
**과목**: ${subject}
**문제**: ${question}

다음 형식으로 답변해주세요:
1. 이 문제의 핵심 개념
2. 풀이 힌트 (단계별로 3-4단계)
3. 주의사항
4. 참고할 만한 유사 문제 유형

**중요**: 정답을 직접 알려주지 말고, 학생이 스스로 생각할 수 있도록 유도해주세요.
`;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            return {
                success: true,
                help: text,
                subject: subject,
                difficulty: this.estimateDifficulty(question)
            };
        } catch (error) {
            console.error('AI 문제 풀이 도움 오류:', error);
            return {
                success: false,
                error: '문제 풀이 도움을 생성하는 중 오류가 발생했습니다.'
            };
        }
    }

    /**
     * 유사 문제 생성
     */
    async generateSimilarProblems(originalProblem, subject, count = 3) {
        try {
            const prompt = `
다음 문제와 유사한 난이도와 유형의 문제를 ${count}개 생성해주세요.

**원본 문제**: ${originalProblem}
**과목**: ${subject}

각 문제는 다음 형식으로 작성해주세요:
{
  "problem": "문제 내용",
  "hints": ["힌트1", "힌트2"],
  "answer": "정답",
  "explanation": "풀이 설명"
}

JSON 배열 형식으로만 응답해주세요.
`;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // JSON 파싱
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const problems = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    problems: problems
                };
            }

            return {
                success: false,
                error: 'AI 응답을 파싱할 수 없습니다.'
            };
        } catch (error) {
            console.error('유사 문제 생성 오류:', error);
            return {
                success: false,
                error: '유사 문제 생성 중 오류가 발생했습니다.'
            };
        }
    }

    /**
     * 개념 설명
     */
    async explainConcept(concept, subject, gradeLevel) {
        try {
            const prompt = `
${gradeLevel} 학생에게 "${concept}" 개념을 쉽고 명확하게 설명해주세요.

**과목**: ${subject}
**개념**: ${concept}

다음 내용을 포함해주세요:
1. 개념의 정의 (쉬운 말로)
2. 일상생활 예시
3. 핵심 포인트 (3-5개)
4. 자주 하는 실수
5. 연관 개념

친근하고 이해하기 쉬운 언어로 설명해주세요.
`;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            return {
                success: true,
                explanation: text,
                concept: concept,
                subject: subject
            };
        } catch (error) {
            console.error('개념 설명 오류:', error);
            return {
                success: false,
                error: '개념 설명을 생성하는 중 오류가 발생했습니다.'
            };
        }
    }

    /**
     * 학습 계획 생성
     */
    async createStudyPlan(subject, topics, duration) {
        try {
            const prompt = `
다음 조건으로 학습 계획을 작성해주세요:

**과목**: ${subject}
**학습 주제**: ${topics.join(', ')}
**학습 기간**: ${duration}일

학습 계획은 다음 형식으로 작성해주세요:
- 일별 학습 내용
- 각 주제별 학습 시간 배분
- 복습 일정
- 평가 시점

JSON 형식으로 응답해주세요:
{
  "totalDays": 숫자,
  "dailyPlans": [
    {
      "day": 1,
      "topics": ["주제1"],
      "duration": "시간",
      "activities": ["활동1", "활동2"]
    }
  ],
  "reviewSchedule": ["복습 일정"],
  "assessmentPoints": ["평가 시점"]
}
`;

            const result = await this.model.generateContent(prompt);
            const response = result.response;
            const text = response.text();

            // JSON 파싱
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const plan = JSON.parse(jsonMatch[0]);
                return {
                    success: true,
                    studyPlan: plan
                };
            }

            return {
                success: false,
                error: 'AI 응답을 파싱할 수 없습니다.'
            };
        } catch (error) {
            console.error('학습 계획 생성 오류:', error);
            return {
                success: false,
                error: '학습 계획 생성 중 오류가 발생했습니다.'
            };
        }
    }

    /**
     * 문제 난이도 추정
     */
    estimateDifficulty(question) {
        const words = this.tokenizer.tokenize(question.toLowerCase());
        const wordCount = words.length;

        // 간단한 휴리스틱 기반 난이도 추정
        if (wordCount < 10) return 'easy';
        if (wordCount < 20) return 'medium';
        return 'hard';
    }

    /**
     * 문제 유형 분류
     */
    classifyProblem(question) {
        return this.classifier.classify(question);
    }
}

module.exports = new AIHomeworkService();
