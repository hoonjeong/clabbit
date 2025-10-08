/**
 * 수납/청구 시스템 API 테스트
 *
 * 실행 방법:
 * node test/billing-api.test.js
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

// 테스트 설정
const BASE_URL = 'http://localhost:3000';
const TEST_ACADEMY_ID = 1;
const TEST_USER_ID = 1;

// Axios 인스턴스 생성
const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
    // 쿠키를 포함하여 세션 유지
    withCredentials: true
});

// 색상 코드
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// 테스트 결과 저장
const testResults = {
    passed: 0,
    failed: 0,
    errors: []
};

// 테스트 유틸리티 함수
function logTest(name, success, error = null) {
    if (success) {
        console.log(`${colors.green}✓${colors.reset} ${name}`);
        testResults.passed++;
    } else {
        console.log(`${colors.red}✗${colors.reset} ${name}`);
        if (error) {
            console.log(`  ${colors.yellow}→ ${error}${colors.reset}`);
        }
        testResults.failed++;
        if (error) {
            testResults.errors.push({ test: name, error });
        }
    }
}

function logSection(title) {
    console.log(`\n${colors.cyan}━━━ ${title} ━━━${colors.reset}`);
}

// 로그인 함수 (세션 생성)
async function login(email, password) {
    try {
        const response = await api.post('/api/auth/login', {
            email: email || 'admin@test.com',
            password: password || 'password123'
        });

        // 쿠키 저장 (세션 유지)
        if (response.headers['set-cookie']) {
            api.defaults.headers.Cookie = response.headers['set-cookie'];
        }

        return response.data;
    } catch (error) {
        throw new Error(`Login failed: ${error.message}`);
    }
}

// 테스트 데이터
let createdItemId = null;
let createdChargeId = null;
let createdPaymentId = null;
let createdRefundId = null;
let createdAutoPaymentId = null;
let testStudentId = null;

// 테스트 시작
async function runTests() {
    console.log(`${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.blue}║   수납/청구 시스템 API 테스트 시작     ║${colors.reset}`);
    console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);

    try {
        // 로그인
        logSection('인증');
        await login();
        logTest('로그인 성공', true);

        // 학생 데이터 조회 (테스트용)
        const studentsResponse = await api.get('/api/students?limit=1');
        if (studentsResponse.data.students && studentsResponse.data.students.length > 0) {
            testStudentId = studentsResponse.data.students[0].id;
            logTest('테스트 학생 ID 확보', true);
        } else {
            throw new Error('테스트할 학생이 없습니다. 먼저 학생을 등록해주세요.');
        }

        // 1. 청구 항목 관리 테스트
        logSection('청구 항목 관리');

        // 청구 항목 생성
        const itemData = {
            name: `테스트 수업료_${Date.now()}`,
            default_amount: 300000,
            description: 'API 테스트용 청구 항목'
        };

        const createItemResponse = await api.post('/api/billing-items', itemData);
        createdItemId = createItemResponse.data.data.id;
        logTest('청구 항목 생성', createItemResponse.status === 200,
            createItemResponse.status !== 200 ? `Status: ${createItemResponse.status}` : null);

        // 청구 항목 목록 조회
        const itemsResponse = await api.get('/api/billing-items');
        logTest('청구 항목 목록 조회', itemsResponse.status === 200 && Array.isArray(itemsResponse.data));

        // 청구 항목 수정
        const updateItemResponse = await api.put(`/api/billing-items/${createdItemId}`, {
            default_amount: 350000,
            description: '수정된 설명'
        });
        logTest('청구 항목 수정', updateItemResponse.status === 200);

        // 2. 청구 관리 테스트
        logSection('청구 관리');

        // 단일 청구 생성
        const chargeData = {
            student_id: testStudentId,
            billing_item_id: createdItemId,
            amount: 300000,
            charge_date: new Date().toISOString().split('T')[0],
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };

        const createChargeResponse = await api.post('/api/charges', chargeData);
        createdChargeId = createChargeResponse.data.data.id;
        logTest('청구 생성', createChargeResponse.status === 200);

        // 청구 목록 조회
        const chargesResponse = await api.get('/api/charges');
        logTest('청구 목록 조회', chargesResponse.status === 200);

        // 청구 상세 조회
        const chargeDetailResponse = await api.get(`/api/charges/${createdChargeId}`);
        logTest('청구 상세 조회', chargeDetailResponse.status === 200);

        // 일괄 청구 생성
        const bulkChargeData = {
            student_ids: [testStudentId],
            billing_item_id: createdItemId,
            amount: 300000,
            charge_month: new Date().toISOString().slice(0, 7)
        };

        const bulkChargeResponse = await api.post('/api/charges/bulk', bulkChargeData);
        logTest('일괄 청구 생성', bulkChargeResponse.status === 200);

        // 3. 수납 처리 테스트
        logSection('수납 처리');

        // 수납 등록
        const paymentData = {
            student_id: testStudentId,
            charge_id: createdChargeId,
            amount: 300000,
            payment_method: 'card',
            payment_date: new Date().toISOString(),
            card_number_masked: '****-****-****-1234'
        };

        const createPaymentResponse = await api.post('/api/payments', paymentData);
        if (createPaymentResponse.data.data) {
            createdPaymentId = createPaymentResponse.data.data.id;
        }
        logTest('수납 등록', createPaymentResponse.status === 200);

        // 수납 목록 조회
        const paymentsResponse = await api.get('/api/payments');
        logTest('수납 목록 조회', paymentsResponse.status === 200);

        // 영수증 번호 생성
        const receiptResponse = await api.post('/api/receipts/generate-number');
        logTest('영수증 번호 생성', receiptResponse.status === 200);

        // 4. 통계 테스트
        logSection('통계 및 리포트');

        // 대시보드 통계
        const dashboardStatsResponse = await api.get('/api/billing/dashboard-stats');
        logTest('대시보드 통계 조회', dashboardStatsResponse.status === 200);

        // 미납자 목록
        const unpaidResponse = await api.get('/api/billing/unpaid-students');
        logTest('미납자 목록 조회', unpaidResponse.status === 200);

        // 월별 통계
        const monthlyStatsResponse = await api.get(`/api/billing/statistics/monthly?month=${new Date().toISOString().slice(0, 7)}`);
        logTest('월별 통계 조회', monthlyStatsResponse.status === 200);

        // 수납 방법별 통계
        const paymentMethodsResponse = await api.get(`/api/billing/statistics/payment-methods?month=${new Date().toISOString().slice(0, 7)}`);
        logTest('수납 방법별 통계', paymentMethodsResponse.status === 200);

        // 5. 환불 처리 테스트
        logSection('환불 처리');

        if (createdPaymentId) {
            // 환불 신청
            const refundData = {
                payment_id: createdPaymentId,
                student_id: testStudentId,
                amount: 300000,
                reason: 'API 테스트 환불',
                refund_method: 'transfer',
                bank_name: '테스트은행',
                account_number: '123-456-789',
                account_holder: '테스트'
            };

            const createRefundResponse = await api.post('/api/refunds', refundData);
            if (createRefundResponse.data.data) {
                createdRefundId = createRefundResponse.data.data.id;
            }
            logTest('환불 신청', createRefundResponse.status === 200);

            // 환불 목록 조회
            const refundsResponse = await api.get('/api/refunds');
            logTest('환불 목록 조회', refundsResponse.status === 200);

            // 환불 승인 (관리자 권한 필요)
            if (createdRefundId) {
                const approveRefundResponse = await api.put(`/api/refunds/${createdRefundId}/approve`);
                logTest('환불 승인', approveRefundResponse.status === 200);
            }
        }

        // 6. 자동이체 관리 테스트
        logSection('자동이체 관리');

        // 자동이체 등록
        const autoPaymentData = {
            student_id: testStudentId,
            bank_name: '테스트은행',
            account_number: '110-123-456789',
            account_holder: '테스트 학부모',
            withdrawal_day: 10,
            monthly_amount: 300000,
            start_date: new Date().toISOString().split('T')[0]
        };

        const createAutoPaymentResponse = await api.post('/api/auto-payments', autoPaymentData);
        if (createAutoPaymentResponse.data.data) {
            createdAutoPaymentId = createAutoPaymentResponse.data.data.id;
        }
        logTest('자동이체 등록', createAutoPaymentResponse.status === 200);

        // 자동이체 목록 조회
        const autoPaymentsResponse = await api.get('/api/auto-payments');
        logTest('자동이체 목록 조회', autoPaymentsResponse.status === 200);

        // 자동이체 통계
        const autoPaymentStatsResponse = await api.get(`/api/auto-payments/statistics?month=${new Date().toISOString().slice(0, 7)}`);
        logTest('자동이체 통계', autoPaymentStatsResponse.status === 200);

        // 7. 할인 정책 테스트
        logSection('할인 정책');

        // 할인 정책 생성
        const discountPolicyData = {
            name: 'API 테스트 할인',
            policy_type: 'test',
            discount_value: 10,
            value_type: 'percentage',
            description: 'API 테스트용 할인 정책'
        };

        const createPolicyResponse = await api.post('/api/discount-policies', discountPolicyData);
        logTest('할인 정책 생성', createPolicyResponse.status === 200);

        // 할인 정책 목록 조회
        const policiesResponse = await api.get('/api/discount-policies');
        logTest('할인 정책 목록 조회', policiesResponse.status === 200);

        // 8. Excel 내보내기 테스트
        logSection('Excel 내보내기');

        // 청구 데이터 내보내기
        try {
            const chargeExportResponse = await api.get('/api/billing/export/charges', {
                responseType: 'arraybuffer'
            });
            logTest('청구 데이터 Excel 내보내기', chargeExportResponse.status === 200);
        } catch (error) {
            logTest('청구 데이터 Excel 내보내기', false, error.message);
        }

        // 수납 데이터 내보내기
        try {
            const paymentExportResponse = await api.get('/api/billing/export/payments', {
                responseType: 'arraybuffer'
            });
            logTest('수납 데이터 Excel 내보내기', paymentExportResponse.status === 200);
        } catch (error) {
            logTest('수납 데이터 Excel 내보내기', false, error.message);
        }

        // 미납자 목록 내보내기
        try {
            const unpaidExportResponse = await api.get('/api/billing/export/unpaid', {
                responseType: 'arraybuffer'
            });
            logTest('미납자 목록 Excel 내보내기', unpaidExportResponse.status === 200);
        } catch (error) {
            logTest('미납자 목록 Excel 내보내기', false, error.message);
        }

        // 9. 정리 (생성한 테스트 데이터 삭제)
        logSection('테스트 데이터 정리');

        // 자동이체 해지
        if (createdAutoPaymentId) {
            await api.put(`/api/auto-payments/${createdAutoPaymentId}/terminate`);
            logTest('자동이체 해지', true);
        }

        // 청구 취소
        if (createdChargeId) {
            await api.delete(`/api/charges/${createdChargeId}`);
            logTest('청구 취소', true);
        }

        // 청구 항목 비활성화
        if (createdItemId) {
            await api.put(`/api/billing-items/${createdItemId}`, { is_active: false });
            logTest('청구 항목 비활성화', true);
        }

    } catch (error) {
        console.error(`\n${colors.red}테스트 중 오류 발생:${colors.reset}`, error.message);
        if (error.response) {
            console.error('응답 데이터:', error.response.data);
        }
    }

    // 결과 출력
    console.log(`\n${colors.blue}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.blue}║          테스트 결과 요약              ║${colors.reset}`);
    console.log(`${colors.blue}╚════════════════════════════════════════╝${colors.reset}`);
    console.log(`${colors.green}✓ 성공: ${testResults.passed}개${colors.reset}`);
    console.log(`${colors.red}✗ 실패: ${testResults.failed}개${colors.reset}`);

    if (testResults.errors.length > 0) {
        console.log(`\n${colors.yellow}실패한 테스트 상세:${colors.reset}`);
        testResults.errors.forEach((error, index) => {
            console.log(`${index + 1}. ${error.test}`);
            console.log(`   ${colors.yellow}→ ${error.error}${colors.reset}`);
        });
    }

    // 성공률 계산
    const totalTests = testResults.passed + testResults.failed;
    const successRate = totalTests > 0 ? ((testResults.passed / totalTests) * 100).toFixed(1) : 0;

    console.log(`\n${colors.cyan}성공률: ${successRate}%${colors.reset}`);

    // 종료 코드 설정 (CI/CD 환경용)
    process.exit(testResults.failed > 0 ? 1 : 0);
}

// 테스트 실행
console.log(`${colors.cyan}서버 URL: ${BASE_URL}${colors.reset}`);
console.log(`${colors.cyan}테스트 시작 시간: ${new Date().toLocaleString('ko-KR')}${colors.reset}\n`);

runTests();