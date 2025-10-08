/**
 * Template 변수 누락 자동 수정 스크립트
 * 진단 결과에서 템플릿 변수 누락 에러를 찾아 자동으로 수정합니다.
 */

const fs = require('fs');
const path = require('path');

// 진단 결과 파일 경로
const REPORT_PATH = path.join(__dirname, '..', 'MENU_DIAGNOSIS_REPORT.json');
const FIX_REPORT_PATH = path.join(__dirname, '..', 'TEMPLATE_FIX_REPORT.json');

class TemplateFixer {
  constructor() {
    this.fixes = [];
    this.errors = [];
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

  // Template 변수 누락 에러만 필터링
  getTemplateErrors(report) {
    return report.pages.filter(
      p => p.errorType === 'TEMPLATE_VARIABLE_MISSING'
    );
  }

  // URL에서 라우트 파일 추정
  findRouteFile(url) {
    const parts = url.split('/').filter(Boolean);

    if (parts.length === 0) return null;

    // 가능한 라우트 파일 경로들
    const possiblePaths = [
      path.join(__dirname, '..', 'src', 'routes', `${parts[0]}.routes.js`),
      path.join(__dirname, '..', 'src', 'routes', `${parts[0]}.js`),
      path.join(__dirname, '..', 'routes', `${parts[0]}.routes.js`),
      path.join(__dirname, '..', 'routes', `${parts[0]}.js`)
    ];

    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  // 라우트 파일에서 해당 URL의 핸들러 찾기 및 수정
  fixRoute(page) {
    const routeFile = this.findRouteFile(page.url);

    if (!routeFile) {
      this.errors.push({
        page: page.name,
        url: page.url,
        error: '라우트 파일을 찾을 수 없음',
        variables: page.missingVariables
      });
      console.log(`⚠️  ${page.name} - 라우트 파일을 찾을 수 없음`);
      return false;
    }

    let content = fs.readFileSync(routeFile, 'utf-8');
    const originalContent = content;

    // URL 경로 파싱
    const urlPath = page.url;
    const urlParts = urlPath.split('/').filter(Boolean);

    // 해당 라우트의 핸들러 찾기 (정규식)
    // 예: router.get('/dashboard', ...)
    // 예: router.get('/students/new', ...)
    const routePattern = urlParts.length > 1 ? `/${urlParts.slice(1).join('/')}` : '/';

    page.missingVariables.forEach(variable => {
      // 각 변수에 대한 기본값 설정
      let defaultValue = 'null';
      let comment = '// TODO: 적절한 값 설정';

      if (variable === 'academyName') {
        defaultValue = "req.user?.academyName || '학원 선택'";
        comment = '';
      } else if (variable === 'userName') {
        defaultValue = "req.user?.name || '사용자'";
        comment = '';
      } else if (variable === 'user') {
        defaultValue = 'req.user';
        comment = '';
      } else if (variable === 'page') {
        defaultValue = `'${urlParts[0] || 'home'}'`;
        comment = '';
      } else if (variable === 'title') {
        defaultValue = `'${page.name}'`;
        comment = '';
      }

      // res.render()를 찾아서 변수 추가
      // 매우 관대한 패턴: res.render로 시작하고, { 를 찾음
      const renderRegex = /(res\.render\s*\(\s*['"`][^'"`]+['"`]\s*,\s*\{[^}]*)/gs;

      content = content.replace(renderRegex, (match) => {
        // 이미 해당 변수가 있는지 확인
        if (match.includes(`${variable}:`)) {
          return match; // 이미 있으면 패스
        }

        // 변수 추가
        return `${match},\n      ${variable}: ${defaultValue}${comment ? ' ' + comment : ''}`;
      });
    });

    // 변경사항이 있으면 저장
    if (content !== originalContent) {
      // 백업
      const backupPath = `${routeFile}.backup`;
      if (!fs.existsSync(backupPath)) {
        fs.writeFileSync(backupPath, originalContent, 'utf-8');
      }

      // 수정된 내용 저장
      fs.writeFileSync(routeFile, content, 'utf-8');

      console.log(`✅ ${page.name} - 변수 추가 완료`);
      console.log(`   파일: ${path.relative(process.cwd(), routeFile)}`);
      console.log(`   변수: ${page.missingVariables.join(', ')}`);

      this.fixes.push({
        page: page.name,
        url: page.url,
        file: path.relative(process.cwd(), routeFile),
        variables: page.missingVariables,
        status: 'fixed'
      });

      return true;
    } else {
      this.errors.push({
        page: page.name,
        url: page.url,
        error: 'res.render()를 찾을 수 없거나 이미 변수가 존재함',
        variables: page.missingVariables
      });
      console.log(`⚠️  ${page.name} - 자동 수정 실패 (수동 확인 필요)`);
      return false;
    }
  }

  // 모든 Template 에러 수정
  fixAll() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║        🔧 Template 변수 누락 자동 수정 시스템               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    const report = this.loadDiagnosisReport();
    if (!report) {
      return;
    }

    const errors = this.getTemplateErrors(report);

    if (errors.length === 0) {
      console.log('✅ Template 변수 누락 에러가 없습니다!\n');
      return;
    }

    console.log(`📝 ${errors.length}개의 Template 변수 누락 에러 발견\n`);

    errors.forEach(page => {
      this.fixRoute(page);
    });

    // 결과 리포트
    console.log('\n' + '═'.repeat(80));
    console.log('📊 수정 결과');
    console.log('═'.repeat(80));
    console.log(`성공: ${this.fixes.length}개 ✅`);
    console.log(`실패: ${this.errors.length}개 ⚠️`);
    console.log('═'.repeat(80));

    if (this.errors.length > 0) {
      console.log('\n⚠️  수동 수정이 필요한 항목:\n');
      this.errors.forEach(err => {
        console.log(`• ${err.page} (${err.url})`);
        console.log(`  → ${err.error}`);
        console.log(`  → 누락 변수: ${err.variables.join(', ')}\n`);
      });
    }

    // 수정 결과 저장
    const fixReport = {
      timestamp: new Date().toISOString(),
      totalErrors: errors.length,
      fixed: this.fixes.length,
      failed: this.errors.length,
      fixes: this.fixes,
      errors: this.errors
    };

    fs.writeFileSync(
      FIX_REPORT_PATH,
      JSON.stringify(fixReport, null, 2),
      'utf-8'
    );

    console.log(`\n💾 수정 결과 저장: ${path.basename(FIX_REPORT_PATH)}`);
    console.log(`\n✨ 총 ${this.fixes.length}개 자동 수정 완료!\n`);

    if (this.fixes.length > 0) {
      console.log('💡 다음 단계:');
      console.log('   1. 서버를 재시작하세요 (npm start)');
      console.log('   2. npm run diagnose로 재진단하세요');
      console.log('   3. 남은 에러를 수동으로 수정하세요\n');
    }
  }
}

// 실행
const fixer = new TemplateFixer();
fixer.fixAll();
