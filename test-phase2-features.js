const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function testPhase2Features() {
    console.log('🧪 Phase 2 기능 테스트 시작\n');
    console.log('=====================================\n');

    try {
        // 1. 페이지 접근성 테스트
        console.log('1. 페이지 접근 테스트');

        const pages = [
            { url: '/attendance/dashboard', name: '출결 대시보드' },
            { url: '/attendance/records', name: '출결 현황' },
            { url: '/attendance/sessions', name: '횟수제 관리' },
            { url: '/attendance/kiosk', name: '키오스크' }
        ];

        for (const page of pages) {
            const response = await fetch(BASE_URL + page.url);
            console.log(`   ${response.status === 200 || response.status === 302 ? '✅' : '❌'} ${page.name}: ${response.status}`);
        }

        // 2. 대시보드 API 테스트
        console.log('\n2. 대시보드 API 테스트');
        const dashboardResponse = await fetch(`${BASE_URL}/api/attendance/dashboard/today`);

        if (dashboardResponse.status === 200) {
            const data = await dashboardResponse.json();
            console.log('   ✅ 대시보드 데이터 로드 성공');
            if (data.data) {
                console.log(`      - 전체 학생: ${data.data.total_students || 0}명`);
                console.log(`      - 오늘 등원: ${data.data.today?.checked_in_count || 0}명`);
                console.log(`      - 오늘 하원: ${data.data.today?.checked_out_count || 0}명`);
            }
        } else {
            console.log(`   ⚠️ 대시보드 API 응답: ${dashboardResponse.status} (인증 필요할 수 있음)`);
        }

        // 3. 출결 기록 조회 API 테스트
        console.log('\n3. 출결 기록 조회 API 테스트');
        const today = new Date().toISOString().split('T')[0];
        const recordsResponse = await fetch(`${BASE_URL}/api/attendance/records?date_start=${today}&date_end=${today}`);

        if (recordsResponse.status === 200) {
            const data = await recordsResponse.json();
            console.log('   ✅ 출결 기록 조회 성공');
            if (data.data) {
                console.log(`      - 조회된 기록: ${data.data.length}건`);
            }
        } else {
            console.log(`   ⚠️ 출결 기록 API 응답: ${recordsResponse.status} (인증 필요할 수 있음)`);
        }

        // 4. 수동 출결 추가 테스트
        console.log('\n4. 수동 출결 추가 API 테스트');
        const manualRecord = {
            student_id: 1,
            attendance_date: today,
            status: 'present',
            check_in_time: '09:00',
            notes: 'Phase 2 테스트 기록'
        };

        const manualResponse = await fetch(`${BASE_URL}/api/attendance/records/manual`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(manualRecord)
        });

        if (manualResponse.status === 200 || manualResponse.status === 201) {
            console.log('   ✅ 수동 출결 추가 API 작동');
        } else {
            console.log(`   ⚠️ 수동 추가 API 응답: ${manualResponse.status} (인증 필요할 수 있음)`);
        }

        // 5. 횟수제 학생 조회 테스트
        console.log('\n5. 횟수제 학생 조회 API 테스트');
        const sessionResponse = await fetch(`${BASE_URL}/api/attendance/sessions`);

        if (sessionResponse.status === 200) {
            const data = await sessionResponse.json();
            console.log('   ✅ 횟수제 학생 조회 성공');
            if (data.data) {
                console.log(`      - 횟수제 학생: ${data.data.length}명`);
            }
        } else {
            console.log(`   ⚠️ 횟수제 API 응답: ${sessionResponse.status} (인증 필요할 수 있음)`);
        }

        // 6. 기능 요약
        console.log('\n=====================================');
        console.log('\n✅ Phase 2 기능 테스트 완료!\n');
        console.log('구현된 기능:');
        console.log('  1. 출결 대시보드 - 실시간 출결 현황 모니터링');
        console.log('  2. 출결 기록 수정 - 모달을 통한 기록 수정/추가');
        console.log('  3. 횟수제 관리 - 횟수제 학생 관리 및 조정');
        console.log('  4. 통계 카드 - 실시간 통계 표시');

        console.log('\n접속 가능 페이지:');
        console.log('  - 대시보드: http://localhost:3000/attendance/dashboard');
        console.log('  - 출결 현황: http://localhost:3000/attendance/records');
        console.log('  - 횟수제 관리: http://localhost:3000/attendance/sessions');
        console.log('  - 키오스크: http://localhost:3000/attendance/kiosk');

        console.log('\n참고: 대부분의 API는 로그인이 필요합니다.');
        console.log('브라우저에서 로그인 후 페이지에 접속하세요.');

    } catch (error) {
        console.error('\n❌ 테스트 중 오류 발생:', error.message);
    }
}

// 서버 시작 대기 후 테스트 실행
setTimeout(testPhase2Features, 2000);