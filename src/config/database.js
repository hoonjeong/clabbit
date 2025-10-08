const mysql = require('mysql2/promise');
const createLogger = require('../utils/logger');

const logger = createLogger('Database');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'clabbit',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 연결 테스트
pool.getConnection()
  .then(connection => {
    logger.info('데이터베이스 연결 성공');
    connection.release();
  })
  .catch(err => {
    logger.error('데이터베이스 연결 실패', { error: err.message });
  });

module.exports = pool;
