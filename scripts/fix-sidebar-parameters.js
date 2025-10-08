/**
 * 사이드바 메뉴 파라미터 자동 수정 스크립트
 * include에 파라미터가 없는 경우 자동으로 추가
 */

const fs = require('fs');
const path = require('path');

// 처리할 디렉토리 목록
const directories = [
    'views/students',
    'views/classes',
    'views/attendance',
    'views/billing',
    'views/payments',
    'views/performance',
    'views/consultation',
    'views/communications',
    'views/class-management',
    'views/ai',
    'views/teachers'
];

// EJS 파일 찾기
function findEjsFiles(dir) {
    const files = [];
    if (!fs.existsSync(dir)) {
        return files;
    }

    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...findEjsFiles(fullPath));
        } else if (item.endsWith('.ejs')) {
            files.push(fullPath);
        }
    }
    return files;
}

// 파일 수정
function fixSidebarParameters(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // 키오스크 페이지는 건너뛰기
        if (filePath.includes('kiosk.ejs')) {
            return false;
        }

        // 패턴 1: include('../components/sidebar-menu') - 파라미터 없음
        const pattern1 = /<%- include\('\.\.\/components\/sidebar-menu'\) %>/g;
        if (pattern1.test(content)) {
            content = content.replace(
                pattern1,
                `<%- include('../components/sidebar-menu', { academyName, page, userName }) %>`
            );
            updated = true;
        }

        // 패턴 2: include('../components/sidebar-menu', {}) - 빈 객체
        const pattern2 = /<%- include\('\.\.\/components\/sidebar-menu',\s*\{\s*\}\s*\) %>/g;
        if (pattern2.test(content)) {
            content = content.replace(
                pattern2,
                `<%- include('../components/sidebar-menu', { academyName, page, userName }) %>`
            );
            updated = true;
        }

        // 패턴 3: include 후 매개변수가 있지만 불완전한 경우 (title만 있는 등)
        const pattern3 = /<%- include\('\.\.\/components\/sidebar-menu',\s*\{\s*title:/g;
        if (pattern3.test(content)) {
            // 기존 파라미터를 유지하면서 academyName, userName 추가
            content = content.replace(
                /<%- include\('\.\.\/components\/sidebar-menu',\s*\{([^}]+)\}\s*\) %>/g,
                (match, params) => {
                    // 이미 academyName이 있는지 확인
                    if (params.includes('academyName')) {
                        return match; // 이미 있으면 그대로
                    }
                    // academyName, page, userName 추가
                    const cleanParams = params.trim().replace(/,$/, '');
                    return `<%- include('../components/sidebar-menu', { ${cleanParams}, academyName, page, userName }) %>`;
                }
            );
            updated = true;
        }

        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }

        return false;
    } catch (error) {
        console.error(`❌ 오류 (${filePath}):`, error.message);
        return false;
    }
}

// 메인 실행
console.log('🔧 사이드바 파라미터 자동 수정 시작...\n');

let totalFiles = 0;
let updatedFiles = 0;

for (const dir of directories) {
    const files = findEjsFiles(dir);
    console.log(`\n📁 ${dir}: ${files.length}개 파일`);

    for (const file of files) {
        totalFiles++;
        if (fixSidebarParameters(file)) {
            updatedFiles++;
            console.log(`   ✅ 수정: ${file}`);
        }
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 작업 완료!`);
console.log(`   전체 파일: ${totalFiles}개`);
console.log(`   수정된 파일: ${updatedFiles}개`);
console.log(`   건너뛴 파일: ${totalFiles - updatedFiles}개`);
console.log(`${'='.repeat(60)}\n`);
