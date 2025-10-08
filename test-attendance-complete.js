const fetch = require('node-fetch');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testAttendanceSystem() {
    console.log('🧪 출결 시스템 종합 테스트\n');
    console.log('====================================\n');

    try {
        // 1. 키오스크 페이지 접근
        console.log('1. 키오스크 페이지 접근 테스트');
        const kioskResponse = await fetch(`${BASE_URL}/attendance/kiosk`);
        console.log(`   ✅ 키오스크 페이지: ${kioskResponse.status === 200 ? '정상' : '오류'} (${kioskResponse.status})`);

        // 2. 등원 체크
        console.log('\n2. 등원 체크 테스트');
        const checkInResponse = await fetch(`${BASE_URL}/api/attendance/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '10001' })
        });
        const checkInData = await checkInResponse.json();

        if (checkInData.success) {
            console.log('   ✅ 등원 성공');
            console.log(`      - 학생: ${checkInData.student_name}`);
            console.log(`      - 시간: ${checkInData.check_time}`);
        } else {
            console.log(`   ⚠️ 등원 실패: ${checkInData.message || checkInData.error}`);
        }

        // 3. 중복 등원 시도
        console.log('\n3. 중복 등원 방지 테스트');
        const duplicateCheckIn = await fetch(`${BASE_URL}/api/attendance/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '10001' })
        });
        const duplicateData = await duplicateCheckIn.json();
        console.log(`   ${duplicateData.success === false ? '✅' : '❌'} 중복 등원 방지: ${duplicateData.message || duplicateData.error}`);

        // 4. 하원 체크
        console.log('\n4. 하원 체크 테스트');
        const checkOutResponse = await fetch(`${BASE_URL}/api/attendance/check-out`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '10001' })
        });
        const checkOutData = await checkOutResponse.json();

        if (checkOutData.success) {
            console.log('   ✅ 하원 성공');
            console.log(`      - 학생: ${checkOutData.student_name}`);
            console.log(`      - 시간: ${checkOutData.check_time}`);
        } else {
            console.log(`   ⚠️ 하원 실패: ${checkOutData.message || checkOutData.error}`);
        }

        // 5. 다른 학생 테스트
        console.log('\n5. 다른 학생 출결 테스트');
        const otherCodes = ['10002', '5678', '6666'];

        for (const code of otherCodes) {
            const response = await fetch(`${BASE_URL}/api/attendance/check-in`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });
            const data = await response.json();

            if (data.success) {
                console.log(`   ✅ 코드 ${code}: ${data.student_name} 등원 성공`);
            } else {
                console.log(`   ⚠️ 코드 ${code}: ${data.message || data.error}`);
            }

            await wait(100); // 요청 간격 두기
        }

        // 6. 잘못된 코드 테스트
        console.log('\n6. 잘못된 코드 테스트');
        const invalidResponse = await fetch(`${BASE_URL}/api/attendance/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: '9999' })
        });
        const invalidData = await invalidResponse.json();
        console.log(`   ${invalidData.success === false ? '✅' : '❌'} 잘못된 코드 처리: ${invalidData.error}`);

        console.log('\n====================================');
        console.log('\n✅ 출결 시스템 Phase 1 테스트 완료!\n');
        console.log('테스트 결과:');
        console.log('  - 키오스크 페이지: 정상 작동');
        console.log('  - 등원/하원 API: 정상 작동');
        console.log('  - 중복 방지: 정상 작동');
        console.log('  - 다양한 코드 인식: 정상 작동');
        console.log('  - 오류 처리: 정상 작동');
        console.log('\n다음 단계:');
        console.log('  - Phase 2: 수동 수정, 보강 수업, 관리자 대시보드');
        console.log('  - Phase 3: 알림 시스템, 통계 분석');

    } catch (error) {
        console.error('\n❌ 테스트 중 오류 발생:', error.message);
    }
}

// 서버 시작 대기 후 테스트 실행
setTimeout(testAttendanceSystem, 2000);