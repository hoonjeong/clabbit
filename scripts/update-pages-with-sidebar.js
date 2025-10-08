/**
 * 모든 페이지에 사이드바 메뉴 적용 스크립트
 * 기존 dashboard-header를 sidebar-menu로 교체
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
        console.log(`⚠️  디렉토리 없음: ${dir}`);
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

// 파일 내용 업데이트
function updateFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let updated = false;

        // 1. dashboard-header를 sidebar-menu로 교체
        if (content.includes('dashboard-header')) {
            content = content.replace(/dashboard-header/g, 'sidebar-menu');
            updated = true;
        }

        // 2. dashboard-main을 main-content로 교체
        if (content.includes('dashboard-main')) {
            content = content.replace(/dashboard-main/g, 'main-content');
            updated = true;
        }

        // 3. CSS 파일 순서 정리 (design-system.css가 먼저 오도록)
        if (content.includes('<link rel="stylesheet"') && !content.includes('design-system.css')) {
            // style.css 앞에 design-system.css 추가
            const styleRegex = /<link rel="stylesheet" href="\/css\/style\.css">/;
            if (styleRegex.test(content)) {
                content = content.replace(
                    styleRegex,
                    `<link rel="stylesheet" href="/css/design-system.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/style.css">`
                );
                updated = true;
            }
        }

        // 4. 키오스크 모드는 제외 (독립 페이지)
        if (filePath.includes('kiosk.ejs')) {
            console.log(`⏭️  건너뜀 (키오스크): ${filePath}`);
            return false;
        }

        if (updated) {
            fs.writeFileSync(filePath, content, 'utf8');
            return true;
        }

        return false;
    } catch (error) {
        console.error(`❌ 오류 발생 (${filePath}):`, error.message);
        return false;
    }
}

// 메인 실행
console.log('🚀 사이드바 메뉴 적용 시작...\n');

let totalFiles = 0;
let updatedFiles = 0;

for (const dir of directories) {
    const files = findEjsFiles(dir);
    console.log(`\n📁 ${dir}: ${files.length}개 파일 발견`);

    for (const file of files) {
        totalFiles++;
        if (updateFile(file)) {
            updatedFiles++;
            console.log(`   ✅ 업데이트: ${file}`);
        } else {
            console.log(`   ⏭️  건너뜀: ${file}`);
        }
    }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`📊 작업 완료!`);
console.log(`   전체 파일: ${totalFiles}개`);
console.log(`   업데이트: ${updatedFiles}개`);
console.log(`   건너뜀: ${totalFiles - updatedFiles}개`);
console.log(`${'='.repeat(60)}\n`);
