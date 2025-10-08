const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testAttendanceAPI() {
    console.log('🧪 출결 API 테스트 시작...\n');

    try {
        // 1. 키오스크 페이지 접근 테스트
        console.log('1. 키오스크 페이지 접근 테스트');
        const kioskResponse = await fetch(`${BASE_URL}/attendance/kiosk`);
        console.log(`   - 상태: ${kioskResponse.status === 200 ? '✅ 성공' : '❌ 실패'}`);
        console.log(`   - Content-Type: ${kioskResponse.headers.get('content-type')}`);

        // 2. 출결 체크인 API 테스트 (테스트용 코드)
        console.log('\n2. 출결 체크인 API 테스트');
        const checkInResponse = await fetch(`${BASE_URL}/api/attendance/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                academyId: 1,
                code: '10001',  // 학원ID 1 + 학생ID 1
                method: 'kiosk'
            })
        });
        const checkInData = await checkInResponse.json();
        console.log(`   - 상태: ${checkInResponse.status === 200 || checkInResponse.status === 404 ? '✅ 응답 정상' : '❌ 오류'}`);
        console.log(`   - 결과:`, checkInData);

        // 3. 출결 대시보드 API 테스트 (인증 없이는 실패 예상)
        console.log('\n3. 출결 대시보드 API 테스트 (인증 필요)');
        const dashboardResponse = await fetch(`${BASE_URL}/api/attendance/dashboard/today`);
        console.log(`   - 상태: ${dashboardResponse.status === 401 ? '✅ 인증 요구 정상' : '⚠️ 예상과 다름'} (${dashboardResponse.status})`);

        // 4. 출결 기록 조회 API 테스트 (인증 없이는 실패 예상)
        console.log('\n4. 출결 기록 조회 API 테스트 (인증 필요)');
        const recordsResponse = await fetch(`${BASE_URL}/api/attendance/records?date_start=2025-01-07&date_end=2025-01-07`);
        console.log(`   - 상태: ${recordsResponse.status === 401 ? '✅ 인증 요구 정상' : '⚠️ 예상과 다름'} (${recordsResponse.status})`);

        console.log('\n✅ 출결 API 테스트 완료!');
        console.log('\n참고: 인증이 필요한 API는 로그인 후 테스트 가능합니다.');

    } catch (error) {
        console.error('❌ 테스트 중 오류 발생:', error.message);
    }
}

// 서버가 시작될 시간을 준 후 테스트 실행
setTimeout(testAttendanceAPI, 1000);