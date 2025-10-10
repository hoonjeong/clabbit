const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const fileUpload = require('express-fileupload');
const path = require('path');
const http = require('http');
require('dotenv').config();

// 설정 및 상수
const { SESSION } = require('./src/config/constants');

// ==================== 환경 변수 검증 ====================
const requiredEnvVars = {
    development: ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'],
    production: ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'SESSION_SECRET']
};

const currentEnv = process.env.NODE_ENV || 'development';
const missingVars = [];

requiredEnvVars[currentEnv].forEach(varName => {
    if (!process.env[varName]) {
        missingVars.push(varName);
    }
});

if (missingVars.length > 0) {
    console.error('❌ 필수 환경 변수가 설정되지 않았습니다:');
    missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
    });
    console.error('\n.env 파일을 확인하고 누락된 환경 변수를 추가하세요.');
    console.error('예시: .env.example 파일을 참조하세요.\n');

    if (currentEnv === 'production') {
        console.error('프로덕션 환경에서는 모든 필수 환경 변수가 설정되어야 합니다.');
        process.exit(1);
    } else {
        console.error('⚠️  개발 환경에서 계속 진행하지만, 일부 기능이 작동하지 않을 수 있습니다.\n');
    }
}

// 데이터베이스 연결 초기화
const db = require('./src/config/database');

// 스케줄러 초기화
const SchedulerService = require('./src/services/scheduler.service');

// WebSocket 서버 초기화
const webSocketServer = require('./src/config/websocket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공
app.use(express.static(path.join(__dirname, 'public')));

// MySQL 세션 스토어 설정
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000, // 15분마다 만료된 세션 정리
  expiration: SESSION.MAX_AGE
});

// 세션 설정
const sessionMiddleware = session({
  key: 'clabbit_session',
  secret: process.env.SESSION_SECRET || SESSION.SECRET_KEY,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: SESSION.MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' // CSRF 방지
  }
});

app.use(sessionMiddleware);

// 파일 업로드 미들웨어
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  createParentPath: true,
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'uploads', 'temp')
}));

// uploads 디렉토리 정적 파일 제공
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 보안 헤더 미들웨어
app.use((req, res, next) => {
  // XSS 방지
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HTTPS 강제 (프로덕션)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Referrer 정책
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // 권한 정책
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
});

// 캐시 제어 미들웨어 (로그아웃 후 뒤로가기 방지)
app.use((req, res, next) => {
  // 정적 파일과 업로드 파일은 캐싱 허용
  if (req.path.startsWith('/uploads/') ||
      req.path.startsWith('/css/') ||
      req.path.startsWith('/js/') ||
      req.path.startsWith('/images/')) {
    return next();
  }

  // 로그인 페이지는 캐싱 허용 (성능 최적화)
  if (req.path === '/login' || req.path === '/') {
    return next();
  }

  // 그 외 모든 페이지는 캐시 비활성화 (보안 강화)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  next();
});

// 미들웨어
app.use(express.json({ limit: '10mb' })); // JSON 크기 제한
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL 인코딩 크기 제한

// 라우트 통합
const routes = require('./src/routes');
app.use('/', routes);

// 에러 핸들링 미들웨어
const { errorHandler, notFoundHandler } = require('./src/middleware/error.middleware');
app.use(notFoundHandler);
app.use(errorHandler);

// 서버 시작
server.listen(PORT, () => {
  console.log(`✅ 클래빗 서버가 포트 ${PORT}에서 실행중입니다.`);
  console.log(`   http://localhost:${PORT}`);

  // WebSocket 서버 초기화
  webSocketServer.initialize(server, sessionStore);
  console.log('🔌 WebSocket 서버가 시작되었습니다.');

  // 스케줄러 시작
  SchedulerService.start();
  console.log('📅 자동 청구 스케줄러가 시작되었습니다.');
});
