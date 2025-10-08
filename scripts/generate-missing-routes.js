/**
 * 미구현 라우트 자동 생성 스크립트
 * 진단 결과에서 404 에러를 찾아 기본 라우트와 뷰를 자동 생성합니다.
 */

const fs = require('fs');
const path = require('path');

// 진단 결과 파일 경로
const REPORT_PATH = path.join(__dirname, '..', 'MENU_DIAGNOSIS_REPORT.json');
const GENERATE_REPORT_PATH = path.join(__dirname, '..', 'ROUTE_GENERATION_REPORT.json');

class RouteGenerator {
  constructor() {
    this.routesDir = path.join(__dirname, '..', 'src', 'routes');
    this.viewsDir = path.join(__dirname, '..', 'views');
    this.generated = [];
    this.errors = [];

    // 디렉토리 확인 및 생성
    if (!fs.existsSync(this.routesDir)) {
      // routes 디렉토리 위치 찾기
      const altRoutesDir = path.join(__dirname, '..', 'routes');
      if (fs.existsSync(altRoutesDir)) {
        this.routesDir = altRoutesDir;
      } else {
        fs.mkdirSync(this.routesDir, { recursive: true });
      }
    }
  }

  // 진단 리포트 로드
  loadDiagnosisReport() {
    if (!fs.existsSync(REPORT_PATH)) {
      console.log('❌ 진단 리포트를 찾을 수 없습니다.');
      console.log('   먼저 npm run diagnose를 실행하세요.');
      return null;
    }

    const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'));
    return report;
  }

  // 라우트 미구현 에러만 필터링
  getMissingRoutes(report) {
    return report.pages.filter(
      p => p.errorType === 'ROUTE_NOT_FOUND'
    );
  }

  // 라우트 템플릿 생성
  generateRouteCode(url, pageName) {
    const parts = url.split('/').filter(Boolean);
    const routePath = parts.length > 1 ? `/${parts.slice(1).join('/')}` : '/';

    return `
// ${pageName} (${url})
router.get('${routePath}', requireAuth, requireAcademy, async (req, res) => {
  try {
    res.render('${parts.join('/')}', {
      title: '${pageName}',
      page: '${parts[0]}',
      academyName: req.academyName,
      userName: req.user?.name || '사용자'
    });
  } catch (error) {
    console.error('${url} Error:', error);
    res.status(500).render('error', {
      title: '오류',
      message: '페이지를 불러오는 중 오류가 발생했습니다.',
      error: error
    });
  }
});
`;
  }

  // EJS 뷰 템플릿 생성
  generateViewTemplate(url, pageName, parent) {
    const parts = url.split('/').filter(Boolean);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><%= title %></title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/css/design-system.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/layout.css">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/dashboard.css">
</head>
<body>
    <%- include('../components/sidebar-menu', { academyName, page: '${parts[0]}', userName: userName }) %>

    <main class="main-content">
        <div class="dashboard-container">
            <!-- 페이지 헤더 -->
            <div class="page-header">
                <h1 class="page-title">${pageName}</h1>
                ${parent ? `<p class="page-subtitle">${parent}</p>` : ''}
            </div>

            <!-- 페이지 콘텐츠 -->
            <section class="content-section">
                <div class="empty-state" style="text-align: center; padding: 60px 20px;">
                    <div class="empty-icon" style="font-size: 64px; margin-bottom: 20px;">🚧</div>
                    <h2 style="color: #374151; margin-bottom: 12px;">페이지 개발 중</h2>
                    <p style="color: #6b7280; font-size: 16px;">
                        이 페이지는 자동 생성되었습니다.<br>
                        실제 기능을 구현해주세요.
                    </p>
                    <div style="margin-top: 32px;">
                        <a href="/dashboard" class="btn btn-primary" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            대시보드로 돌아가기
                        </a>
                    </div>
                </div>
            </section>
        </div>
    </main>

    <script src="/js/navigation.js"></script>
</body>
</html>
`;
  }

  // 라우트 및 뷰 생성
  generateRoute(page) {
    const parts = page.url.split('/').filter(Boolean);
    const routeName = parts[0];
    const routeFile = path.join(this.routesDir, `${routeName}.routes.js`);

    try {
      // 1. 라우트 파일 생성 또는 업데이트
      if (fs.existsSync(routeFile)) {
        // 기존 파일에 라우트 추가
        let content = fs.readFileSync(routeFile, 'utf-8');

        // 이미 있는지 확인
        if (content.includes(page.url)) {
          console.log(`⚠️  ${page.name} - 라우트가 이미 존재함`);
          this.errors.push({
            page: page.name,
            url: page.url,
            error: '라우트가 이미 파일에 존재함'
          });
          return false;
        }

        const newRoute = this.generateRouteCode(page.url, page.name);

        // module.exports 앞에 추가
        content = content.replace(
          /module\.exports\s*=\s*router;/,
          `${newRoute}\nmodule.exports = router;`
        );

        fs.writeFileSync(routeFile, content, 'utf-8');
        console.log(`✅ ${page.name} - 라우트 추가됨: ${path.basename(routeFile)}`);
      } else {
        // 새 라우트 파일 생성
        const newRouteFile = `const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAcademy } = require('../middleware/academy.middleware');

${this.generateRouteCode(page.url, page.name)}

module.exports = router;
`;
        fs.writeFileSync(routeFile, newRouteFile, 'utf-8');
        console.log(`✅ ${page.name} - 라우트 파일 생성됨: ${path.basename(routeFile)}`);
      }

      // 2. 뷰 파일 생성
      const viewPath = path.join(this.viewsDir, `${parts.join('/')}.ejs`);
      const viewDir = path.dirname(viewPath);

      if (!fs.existsSync(viewDir)) {
        fs.mkdirSync(viewDir, { recursive: true });
      }

      if (!fs.existsSync(viewPath)) {
        const viewContent = this.generateViewTemplate(page.url, page.name, page.parent);
        fs.writeFileSync(viewPath, viewContent, 'utf-8');
        console.log(`   뷰 파일 생성됨: ${path.relative(this.viewsDir, viewPath)}`);
      }

      this.generated.push({
        page: page.name,
        url: page.url,
        routeFile: path.relative(process.cwd(), routeFile),
        viewPath: path.relative(process.cwd(), viewPath),
        status: 'generated'
      });

      return true;

    } catch (error) {
      this.errors.push({
        page: page.name,
        url: page.url,
        error: error.message
      });
      console.log(`❌ ${page.name} - 생성 실패: ${error.message}`);
      return false;
    }
  }

  // 모든 미구현 라우트 생성
  generateAll() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           🔗 미구현 라우트 자동 생성 시스템                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    const report = this.loadDiagnosisReport();
    if (!report) {
      return;
    }

    const missing = this.getMissingRoutes(report);

    if (missing.length === 0) {
      console.log('✅ 미구현 라우트가 없습니다!\n');
      return;
    }

    console.log(`📝 ${missing.length}개의 미구현 라우트 발견\n`);

    missing.forEach(page => {
      this.generateRoute(page);
    });

    // 결과 리포트
    console.log('\n' + '═'.repeat(80));
    console.log('📊 생성 결과');
    console.log('═'.repeat(80));
    console.log(`성공: ${this.generated.length}개 ✅`);
    console.log(`실패: ${this.errors.length}개 ⚠️`);
    console.log('═'.repeat(80));

    if (this.errors.length > 0) {
      console.log('\n⚠️  생성 실패 항목:\n');
      this.errors.forEach(err => {
        console.log(`• ${err.page} (${err.url})`);
        console.log(`  → ${err.error}\n`);
      });
    }

    // 생성 결과 저장
    const generateReport = {
      timestamp: new Date().toISOString(),
      totalMissing: missing.length,
      generated: this.generated.length,
      failed: this.errors.length,
      routes: this.generated,
      errors: this.errors
    };

    fs.writeFileSync(
      GENERATE_REPORT_PATH,
      JSON.stringify(generateReport, null, 2),
      'utf-8'
    );

    console.log(`\n💾 생성 결과 저장: ${path.basename(GENERATE_REPORT_PATH)}`);
    console.log(`\n✨ 총 ${this.generated.length}개 라우트 및 뷰 생성 완료!\n`);

    if (this.generated.length > 0) {
      console.log('💡 다음 단계:');
      console.log('   1. server.js에 새 라우트를 등록하세요');
      console.log('      예: app.use(\'/billing\', require(\'./src/routes/billing.routes\'));');
      console.log('   2. 서버를 재시작하세요 (npm start)');
      console.log('   3. npm run diagnose로 재진단하세요');
      console.log('   4. 각 페이지의 실제 기능을 구현하세요\n');
    }
  }
}

// 실행
const generator = new RouteGenerator();
generator.generateAll();
