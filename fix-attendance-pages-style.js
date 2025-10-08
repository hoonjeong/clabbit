const fs = require('fs');
const path = require('path');

// 수정할 파일 목록 (kiosk 제외)
const files = [
    'views/attendance/records.ejs',
    'views/attendance/sessions.ejs',
    'views/attendance/makeup.ejs',
    'views/attendance/statistics.ejs'
];

files.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);

    try {
        let content = fs.readFileSync(fullPath, 'utf8');

        // dashboard.css 추가 (없는 경우)
        if (!content.includes('dashboard.css')) {
            content = content.replace(
                '<link rel="stylesheet" href="/css/style.css">',
                '<link rel="stylesheet" href="/css/style.css">\n    <link rel="stylesheet" href="/css/dashboard.css">'
            );
        }

        // body padding 추가 (style 태그 안에)
        if (!content.includes('body {') && !content.includes('padding-top: 70px')) {
            // <style> 태그 찾기
            if (content.includes('<style>')) {
                content = content.replace(
                    '<style>',
                    `<style>
        /* Body padding for fixed header */
        body {
            padding-top: 70px;
        }
`
                );
            }
        }

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Fixed: ${filePath}`);
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
});

console.log('\n✅ 모든 출결 페이지 스타일 수정 완료!');