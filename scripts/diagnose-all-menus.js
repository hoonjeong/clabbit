/**
 * 전체 메뉴 진단 스크립트
 * 사이드바의 모든 메뉴 링크를 자동으로 점검하여 에러를 발견하고 분류합니다.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 설정
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const REPORT_JSON = path.join(__dirname, '..', 'MENU_DIAGNOSIS_REPORT.json');
const REPORT_HTML = path.join(__dirname, '..', 'MENU_DIAGNOSIS_REPORT.html');

// 사이드바 메뉴 구조 (실제 sidebar-menu.ejs에서 추출)
const MENU_STRUCTURE = [
  {
    name: '대시보드',
    url: '/dashboard',
    type: 'main'
  },
  // 학생 관리
  {
    name: '학생 목록',
    url: '/students',
    type: 'submenu',
    parent: '학생 관리'
  },
  {
    name: '학생 등록',
    url: '/students/new',
    type: 'submenu',
    parent: '학생 관리'
  },
  {
    name: '엑셀 일괄등록',
    url: '/students/bulk',
    type: 'submenu',
    parent: '학생 관리'
  },
  {
    name: '퇴원생 관리',
    url: '/students/withdrawn',
    type: 'submenu',
    parent: '학생 관리'
  },
  // 수업 관리
  {
    name: '수업 목록',
    url: '/classes',
    type: 'submenu',
    parent: '수업 관리'
  },
  {
    name: '수업 추가',
    url: '/classes/new',
    type: 'submenu',
    parent: '수업 관리'
  },
  {
    name: '강사 관리',
    url: '/teachers',
    type: 'submenu',
    parent: '수업 관리'
  },
  {
    name: '수업 일정',
    url: '/classes/schedules',
    type: 'submenu',
    parent: '수업 관리'
  },
  {
    name: '학습 자료',
    url: '/classes/materials',
    type: 'submenu',
    parent: '수업 관리'
  },
  {
    name: '과제 관리',
    url: '/classes/assignments',
    type: 'submenu',
    parent: '수업 관리'
  },
  // 출결 관리
  {
    name: '출결 대시보드',
    url: '/attendance/dashboard',
    type: 'submenu',
    parent: '출결 관리'
  },
  {
    name: '출결 현황',
    url: '/attendance/records',
    type: 'submenu',
    parent: '출결 관리'
  },
  {
    name: '횟수제 관리',
    url: '/attendance/sessions',
    type: 'submenu',
    parent: '출결 관리'
  },
  {
    name: '보강 수업',
    url: '/attendance/makeup',
    type: 'submenu',
    parent: '출결 관리'
  },
  {
    name: '출결 통계',
    url: '/attendance/statistics',
    type: 'submenu',
    parent: '출결 관리'
  },
  {
    name: '키오스크 모드',
    url: '/attendance/kiosk',
    type: 'submenu',
    parent: '출결 관리'
  },
  // 청구/수납
  {
    name: '청구/수납 대시보드',
    url: '/billing/dashboard',
    type: 'submenu',
    parent: '청구/수납'
  },
  {
    name: '청구 관리',
    url: '/billing/charges',
    type: 'submenu',
    parent: '청구/수납'
  },
  {
    name: '수납 관리',
    url: '/billing/payments',
    type: 'submenu',
    parent: '청구/수납'
  },
  {
    name: '미납자 관리',
    url: '/billing/unpaid',
    type: 'submenu',
    parent: '청구/수납'
  },
  {
    name: '청구 항목 설정',
    url: '/billing/items',
    type: 'submenu',
    parent: '청구/수납'
  },
  {
    name: '청구/수납 통계',
    url: '/billing/statistics',
    type: 'submenu',
    parent: '청구/수납'
  },
  // 학습 관리
  {
    name: '성적 관리',
    url: '/performance/exams',
    type: 'submenu',
    parent: '학습 관리'
  },
  {
    name: '상담 관리',
    url: '/consultation/records',
    type: 'submenu',
    parent: '학습 관리'
  },
  {
    name: 'AI 학습 분석',
    url: '/ai/analysis',
    type: 'submenu',
    parent: '학습 관리'
  },
  // 소통 관리
  {
    name: '공지사항',
    url: '/communications/announcements',
    type: 'submenu',
    parent: '소통 관리'
  },
  {
    name: '메시지',
    url: '/communications/messages',
    type: 'submenu',
    parent: '소통 관리'
  },
  {
    name: '알림 설정',
    url: '/communications/notifications',
    type: 'submenu',
    parent: '소통 관리'
  },
  // 보고서
  {
    name: '보고서',
    url: '/reports',
    type: 'main'
  }
];

class MenuDiagnostics {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      totalPages: 0,
      successPages: 0,
      errorPages: 0,
      pages: []
    };

    this.cookies = null;
  }

  // 로그인 (필요한 경우)
  async login() {
    console.log('\n🔐 로그인 시도 중...');

    try {
      // 기본 대시보드 접속 시도하여 인증 필요 여부 확인
      const testResponse = await axios.get(`${BASE_URL}/dashboard`, {
        validateStatus: () => true,
        maxRedirects: 0
      });

      // 302 리다이렉트 = 로그인 필요
      if (testResponse.status === 302 || testResponse.status === 401) {
        console.log('⚠️  인증이 필요합니다. 로그인 없이 진행합니다.');
        console.log('   일부 페이지는 접근이 제한될 수 있습니다.');
      } else if (testResponse.status === 200) {
        console.log('✅ 인증 없이 접근 가능합니다.');
      }

      return true;

    } catch (error) {
      console.log('⚠️  서버 연결 확인 중 오류:', error.message);
      return false;
    }
  }

  // 각 페이지 진단
  async diagnosePage(link) {
    const url = link.url.startsWith('http') ? link.url : `${BASE_URL}${link.url}`;

    const result = {
      name: link.name,
      url: link.url,
      type: link.type,
      parent: link.parent || null,
      status: 'unknown',
      statusCode: null,
      error: null,
      errorType: null,
      errorDetails: null,
      missingVariables: [],
      recommendations: []
    };

    try {
      const response = await axios.get(url, {
        headers: this.cookies ? { Cookie: this.cookies } : {},
        validateStatus: () => true, // 모든 상태 코드 허용
        maxRedirects: 0,
        timeout: 5000
      });

      result.statusCode = response.status;

      // 성공
      if (response.status === 200) {
        result.status = 'success';
        console.log(`✅ ${link.name.padEnd(20)} (${link.url})`);
      }

      // 302 리다이렉트 (로그인 필요)
      else if (response.status === 302) {
        result.status = 'warning';
        result.errorType = 'AUTH_REQUIRED';
        result.error = '인증 필요 (로그인 리다이렉트)';
        result.recommendations.push('로그인 후 접근 가능');
        console.log(`⚠️  ${link.name.padEnd(20)} (${link.url}) - 인증 필요`);
      }

      // 404 - 라우트 없음
      else if (response.status === 404) {
        result.status = 'error';
        result.errorType = 'ROUTE_NOT_FOUND';
        result.error = '라우트가 구현되지 않음';
        result.recommendations.push('라우트를 생성하세요');
        console.log(`❌ ${link.name.padEnd(20)} (${link.url}) - 404 라우트 없음`);
      }

      // 500 - 서버 에러
      else if (response.status === 500) {
        result.status = 'error';
        result.errorType = 'SERVER_ERROR';

        // HTML 응답에서 에러 메시지 추출 시도
        if (typeof response.data === 'string') {
          // EJS 변수 누락 에러 패턴
          const varMissingMatch = response.data.match(/(\w+)\s+is\s+not\s+defined/);
          if (varMissingMatch) {
            result.errorType = 'TEMPLATE_VARIABLE_MISSING';
            result.missingVariables.push(varMissingMatch[1]);
            result.error = `템플릿 변수 누락: ${varMissingMatch[1]}`;
            result.recommendations.push(
              `라우터에서 res.render 시 { ${varMissingMatch[1]}: ... } 변수를 전달하세요`
            );
          }

          // Include 에러
          else if (response.data.includes('Failed to lookup view') ||
                   response.data.includes('include')) {
            result.errorType = 'TEMPLATE_INCLUDE_ERROR';
            result.error = 'Include 파일 또는 변수 오류';
            result.recommendations.push('Include에 필요한 모든 변수를 전달하세요');
          }

          // Database 에러
          else if (response.data.match(/ER_|Table.*doesn't exist|Unknown column/)) {
            result.errorType = 'DATABASE_ERROR';
            result.error = 'Database 스키마 오류';
            result.recommendations.push('데이터베이스 스키마를 확인하세요');
          }

          else {
            result.error = '서버 내부 오류';
            result.errorDetails = 'HTML 응답에서 상세 오류 확인 필요';
          }
        } else {
          result.error = '서버 내부 오류';
        }

        console.log(`❌ ${link.name.padEnd(20)} (${link.url}) - ${result.error}`);
      }

      // 기타 에러
      else {
        result.status = 'error';
        result.errorType = 'HTTP_ERROR';
        result.error = `HTTP ${response.status}`;
        console.log(`⚠️  ${link.name.padEnd(20)} (${link.url}) - ${result.error}`);
      }

    } catch (error) {
      result.status = 'error';

      if (error.code === 'ECONNREFUSED') {
        result.errorType = 'CONNECTION_ERROR';
        result.error = '서버가 실행 중이지 않습니다';
        result.recommendations.push('npm start로 서버를 시작하세요');
      } else if (error.code === 'ETIMEDOUT') {
        result.errorType = 'TIMEOUT_ERROR';
        result.error = '응답 시간 초과';
        result.recommendations.push('서버 성능을 확인하세요');
      } else {
        result.errorType = 'CONNECTION_ERROR';
        result.error = error.message;
      }

      console.log(`❌ ${link.name.padEnd(20)} (${link.url}) - ${result.error}`);
    }

    return result;
  }

  // 모든 페이지 진단
  async diagnoseAll() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║          🔍 클래빗 전체 메뉴 진단 시스템                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    // 서버 연결 확인
    const connected = await this.login();
    if (!connected) {
      console.log('\n❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
      console.log('   명령: npm start');
      return;
    }

    console.log(`\n📋 총 ${MENU_STRUCTURE.length}개의 메뉴를 진단합니다...\n`);

    // 각 페이지 진단
    this.results.totalPages = MENU_STRUCTURE.length;

    for (const link of MENU_STRUCTURE) {
      const result = await this.diagnosePage(link);
      this.results.pages.push(result);

      if (result.status === 'success') {
        this.results.successPages++;
      } else {
        this.results.errorPages++;
      }

      // 과부하 방지
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 리포트 생성
    this.generateReport();
  }

  // 리포트 생성
  generateReport() {
    console.log('\n' + '═'.repeat(80));
    console.log('📊 진단 결과 요약');
    console.log('═'.repeat(80));
    console.log(`총 페이지: ${this.results.totalPages}`);
    console.log(`정상: ${this.results.successPages} ✅`);
    console.log(`에러: ${this.results.errorPages} ❌`);
    console.log(`성공률: ${((this.results.successPages / this.results.totalPages) * 100).toFixed(1)}%`);
    console.log('═'.repeat(80));

    // 에러 유형별 분류
    const errorsByType = {};
    this.results.pages
      .filter(p => p.status === 'error')
      .forEach(p => {
        if (!errorsByType[p.errorType]) {
          errorsByType[p.errorType] = [];
        }
        errorsByType[p.errorType].push(p);
      });

    if (Object.keys(errorsByType).length > 0) {
      console.log('\n📋 에러 유형별 분류:\n');

      Object.keys(errorsByType).sort().forEach(type => {
        const pages = errorsByType[type];
        console.log(`\n${this.getErrorTypeIcon(type)} ${this.getErrorTypeName(type)} (${pages.length}개)`);
        pages.forEach(p => {
          console.log(`   • ${p.name} (${p.url})`);
          if (p.missingVariables.length > 0) {
            console.log(`     → 누락 변수: ${p.missingVariables.join(', ')}`);
          }
          if (p.recommendations.length > 0) {
            console.log(`     💡 ${p.recommendations[0]}`);
          }
        });
      });
    }

    // 파일로 저장
    fs.writeFileSync(
      REPORT_JSON,
      JSON.stringify(this.results, null, 2),
      'utf-8'
    );

    console.log(`\n💾 JSON 리포트 저장: ${path.basename(REPORT_JSON)}`);

    // HTML 리포트 생성
    this.generateHTMLReport();

    console.log(`📄 HTML 리포트 저장: ${path.basename(REPORT_HTML)}`);
    console.log(`\n✨ 브라우저에서 ${path.basename(REPORT_HTML)}를 열어서 상세 결과를 확인하세요!\n`);
  }

  getErrorTypeIcon(type) {
    const icons = {
      'TEMPLATE_VARIABLE_MISSING': '📝',
      'ROUTE_NOT_FOUND': '🔗',
      'DATABASE_ERROR': '🗄️',
      'TEMPLATE_INCLUDE_ERROR': '📄',
      'SERVER_ERROR': '⚠️',
      'CONNECTION_ERROR': '🔌',
      'AUTH_REQUIRED': '🔐',
      'TIMEOUT_ERROR': '⏱️',
      'HTTP_ERROR': '🌐'
    };
    return icons[type] || '❓';
  }

  getErrorTypeName(type) {
    const names = {
      'TEMPLATE_VARIABLE_MISSING': '템플릿 변수 누락',
      'ROUTE_NOT_FOUND': '라우트 미구현',
      'DATABASE_ERROR': 'Database 오류',
      'TEMPLATE_INCLUDE_ERROR': 'Include 오류',
      'SERVER_ERROR': '서버 에러',
      'CONNECTION_ERROR': '연결 실패',
      'AUTH_REQUIRED': '인증 필요',
      'TIMEOUT_ERROR': '시간 초과',
      'HTTP_ERROR': 'HTTP 에러'
    };
    return names[type] || type;
  }

  // HTML 리포트 생성
  generateHTMLReport() {
    const errorsByType = {};
    this.results.pages
      .filter(p => p.status === 'error')
      .forEach(p => {
        if (!errorsByType[p.errorType]) {
          errorsByType[p.errorType] = [];
        }
        errorsByType[p.errorType].push(p);
      });

    const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>클래빗 메뉴 진단 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
      min-height: 100vh;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    .header {
      background: white;
      padding: 40px;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
      margin-bottom: 24px;
      text-align: center;
    }
    h1 {
      color: #1a202c;
      font-size: 36px;
      margin-bottom: 12px;
      font-weight: 800;
    }
    .timestamp {
      color: #718096;
      font-size: 14px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      text-align: center;
      transition: transform 0.2s;
    }
    .stat-card:hover {
      transform: translateY(-4px);
    }
    .stat-value {
      font-size: 48px;
      font-weight: bold;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat-label {
      color: #4a5568;
      font-size: 16px;
      font-weight: 600;
    }
    .success-rate {
      font-size: 24px;
      margin-top: 8px;
      color: #48bb78;
    }
    .section {
      background: white;
      padding: 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
      margin-bottom: 24px;
    }
    h2 {
      font-size: 24px;
      color: #1a202c;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 3px solid #667eea;
    }
    .filter-buttons {
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-btn {
      padding: 10px 20px;
      border: 2px solid #e2e8f0;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      font-size: 14px;
    }
    .filter-btn:hover {
      border-color: #667eea;
      background: #f7fafc;
    }
    .filter-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: transparent;
    }
    .page-item {
      padding: 20px;
      border-left: 4px solid #e2e8f0;
      margin-bottom: 12px;
      background: #f7fafc;
      border-radius: 8px;
      transition: all 0.2s;
    }
    .page-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .page-item.success { border-left-color: #48bb78; background: #f0fff4; }
    .page-item.error { border-left-color: #f56565; background: #fff5f5; }
    .page-item.warning { border-left-color: #ed8936; background: #fffaf0; }
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 8px;
    }
    .page-name {
      font-weight: 700;
      font-size: 16px;
      color: #1a202c;
    }
    .page-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-success { background: #c6f6d5; color: #22543d; }
    .badge-error { background: #fed7d7; color: #742a2a; }
    .badge-warning { background: #feebc8; color: #7c2d12; }
    .page-url {
      color: #718096;
      font-size: 14px;
      font-family: 'Monaco', 'Courier New', monospace;
      margin-bottom: 8px;
    }
    .page-parent {
      display: inline-block;
      background: #edf2f7;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #4a5568;
      margin-bottom: 8px;
    }
    .error-details {
      background: #fff5f5;
      border: 1px solid #fc8181;
      padding: 12px;
      border-radius: 6px;
      margin-top: 12px;
      font-size: 14px;
      color: #742a2a;
    }
    .error-title {
      font-weight: 700;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .recommendations {
      margin-top: 12px;
      padding: 12px;
      background: #ebf8ff;
      border-left: 3px solid #3182ce;
      border-radius: 6px;
    }
    .recommendations-title {
      font-weight: 700;
      color: #2c5282;
      margin-bottom: 8px;
    }
    .recommendations li {
      margin-left: 20px;
      margin-top: 6px;
      color: #2d3748;
    }
    .error-type-section {
      margin-bottom: 32px;
    }
    .error-type-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .error-count {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔍 클래빗 메뉴 진단 리포트</h1>
      <div class="timestamp">생성 시간: ${new Date(this.results.timestamp).toLocaleString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })}</div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${this.results.totalPages}</div>
        <div class="stat-label">총 페이지</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #48bb78;">${this.results.successPages}</div>
        <div class="stat-label">정상 페이지</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color: #f56565;">${this.results.errorPages}</div>
        <div class="stat-label">에러 페이지</div>
      </div>
      <div class="stat-card">
        <div class="stat-value success-rate">${((this.results.successPages / this.results.totalPages) * 100).toFixed(1)}%</div>
        <div class="stat-label">성공률</div>
      </div>
    </div>

    ${Object.keys(errorsByType).length > 0 ? `
    <div class="section">
      <h2>📋 에러 유형별 분류</h2>
      ${Object.keys(errorsByType).sort().map(type => `
        <div class="error-type-section">
          <div class="error-type-header">
            <span>${this.getErrorTypeIcon(type)}</span>
            <span>${this.getErrorTypeName(type)}</span>
            <span class="error-count">${errorsByType[type].length}개</span>
          </div>
          ${errorsByType[type].map(page => `
            <div class="page-item error">
              <div class="page-header">
                <div>
                  <div class="page-name">❌ ${page.name}</div>
                  ${page.parent ? `<div class="page-parent">${page.parent}</div>` : ''}
                </div>
              </div>
              <div class="page-url">${page.url}</div>
              <div class="error-details">
                <div class="error-title">
                  <span>${this.getErrorTypeIcon(page.errorType)}</span>
                  <span>${page.error}</span>
                </div>
                ${page.missingVariables.length > 0 ?
                  `<div style="margin-top: 8px;"><strong>누락 변수:</strong> <code>${page.missingVariables.join(', ')}</code></div>` : ''}
              </div>
              ${page.recommendations.length > 0 ? `
                <div class="recommendations">
                  <div class="recommendations-title">💡 수정 방법</div>
                  <ul>
                    ${page.recommendations.map(r => `<li>${r}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>📄 전체 페이지 목록</h2>
      <div class="filter-buttons">
        <button class="filter-btn active" onclick="filterPages('all')">전체 (${this.results.totalPages})</button>
        <button class="filter-btn" onclick="filterPages('success')">정상만 (${this.results.successPages})</button>
        <button class="filter-btn" onclick="filterPages('error')">에러만 (${this.results.errorPages})</button>
      </div>
      <div id="pages-list">
        ${this.results.pages.map(page => `
          <div class="page-item ${page.status}" data-status="${page.status}">
            <div class="page-header">
              <div>
                <div class="page-name">
                  ${page.status === 'success' ? '✅' : page.status === 'warning' ? '⚠️' : '❌'} ${page.name}
                </div>
                ${page.parent ? `<div class="page-parent">${page.parent}</div>` : ''}
              </div>
              <span class="page-badge badge-${page.status}">
                ${page.status === 'success' ? '정상' : page.status === 'warning' ? '경고' : '에러'}
              </span>
            </div>
            <div class="page-url">${page.url}</div>
            ${page.error ? `
              <div class="error-details">
                <div class="error-title">
                  <span>${this.getErrorTypeIcon(page.errorType)}</span>
                  <span>${this.getErrorTypeName(page.errorType)}: ${page.error}</span>
                </div>
                ${page.missingVariables.length > 0 ?
                  `<div style="margin-top: 8px;"><strong>누락 변수:</strong> <code>${page.missingVariables.join(', ')}</code></div>` : ''}
              </div>
            ` : ''}
            ${page.recommendations.length > 0 ? `
              <div class="recommendations">
                <div class="recommendations-title">💡 수정 방법</div>
                <ul>
                  ${page.recommendations.map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <script>
    function filterPages(type) {
      const items = document.querySelectorAll('.page-item');
      const buttons = document.querySelectorAll('.filter-btn');

      buttons.forEach(btn => btn.classList.remove('active'));
      event.target.classList.add('active');

      items.forEach(item => {
        if (type === 'all' || item.dataset.status === type) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>`;

    fs.writeFileSync(REPORT_HTML, html, 'utf-8');
  }
}

// 실행
const diagnostics = new MenuDiagnostics();
diagnostics.diagnoseAll().then(() => {
  console.log('✨ 진단 완료!\n');
  process.exit(0);
}).catch(error => {
  console.error('❌ 진단 실패:', error);
  process.exit(1);
});
