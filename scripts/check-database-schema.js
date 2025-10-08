/**
 * Database 스키마 확인 스크립트
 * 데이터베이스의 테이블 구조를 확인하고 리포트를 생성합니다.
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const REPORT_PATH = path.join(__dirname, '..', 'DATABASE_SCHEMA_REPORT.json');

class DatabaseSchemaChecker {
  constructor() {
    this.connection = null;
    this.tables = [];
  }

  // 데이터베이스 연결
  async connect() {
    try {
      this.connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'clabbit_db'
      });

      console.log('✅ 데이터베이스 연결 성공');
      return true;
    } catch (error) {
      console.error('❌ 데이터베이스 연결 실패:', error.message);
      console.log('\n💡 .env 파일을 확인하세요:');
      console.log('   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME\n');
      return false;
    }
  }

  // 모든 테이블 조회
  async getTables() {
    try {
      const [tables] = await this.connection.query('SHOW TABLES');
      return tables.map(row => Object.values(row)[0]);
    } catch (error) {
      console.error('❌ 테이블 조회 실패:', error.message);
      return [];
    }
  }

  // 테이블 구조 조회
  async getTableStructure(tableName) {
    try {
      const [columns] = await this.connection.query(`DESCRIBE ${tableName}`);

      const [indexes] = await this.connection.query(
        `SHOW INDEXES FROM ${tableName}`
      );

      const [rowCount] = await this.connection.query(
        `SELECT COUNT(*) as count FROM ${tableName}`
      );

      return {
        name: tableName,
        columns: columns,
        indexes: indexes,
        rowCount: rowCount[0].count
      };
    } catch (error) {
      console.error(`❌ ${tableName} 구조 조회 실패:`, error.message);
      return null;
    }
  }

  // 전체 스키마 확인
  async checkAll() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║            🗄️ Database 스키마 확인 시스템                  ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');

    const connected = await this.connect();
    if (!connected) {
      return;
    }

    console.log('\n📊 테이블 조회 중...\n');

    const tableNames = await this.getTables();

    if (tableNames.length === 0) {
      console.log('⚠️  테이블이 없습니다.');
      console.log('   database/schema.sql을 실행하세요.\n');
      await this.connection.end();
      return;
    }

    console.log(`✅ 총 ${tableNames.length}개의 테이블 발견\n`);

    const report = {
      timestamp: new Date().toISOString(),
      database: process.env.DB_NAME || 'clabbit_db',
      totalTables: tableNames.length,
      tables: []
    };

    for (const tableName of tableNames) {
      console.log(`📋 ${tableName} 분석 중...`);

      const structure = await this.getTableStructure(tableName);

      if (structure) {
        report.tables.push(structure);

        console.log(`   컬럼: ${structure.columns.length}개`);
        console.log(`   인덱스: ${structure.indexes.length}개`);
        console.log(`   데이터: ${structure.rowCount}행\n`);
      }
    }

    // 리포트 저장
    fs.writeFileSync(
      REPORT_PATH,
      JSON.stringify(report, null, 2),
      'utf-8'
    );

    console.log('═'.repeat(80));
    console.log('📊 스키마 확인 완료');
    console.log('═'.repeat(80));
    console.log(`총 테이블: ${report.totalTables}개`);
    console.log(`총 데이터: ${report.tables.reduce((sum, t) => sum + t.rowCount, 0)}행`);
    console.log('═'.repeat(80));

    console.log(`\n💾 리포트 저장: ${path.basename(REPORT_PATH)}\n`);

    // 주요 테이블 확인
    const requiredTables = [
      'users',
      'academies',
      'user_academy_roles',
      'students',
      'student_events',
      'classes',
      'attendance_records'
    ];

    const missingTables = requiredTables.filter(
      table => !tableNames.includes(table)
    );

    if (missingTables.length > 0) {
      console.log('⚠️  누락된 필수 테이블:\n');
      missingTables.forEach(table => {
        console.log(`   • ${table}`);
      });
      console.log('\n   database/schema.sql을 다시 실행하세요.\n');
    } else {
      console.log('✅ 모든 필수 테이블이 존재합니다!\n');
    }

    // 테이블 상세 정보
    console.log('📋 테이블 상세 정보:\n');

    report.tables.forEach(table => {
      console.log(`\n[${table.name}] (${table.rowCount}행)`);

      const pkColumns = table.columns.filter(col => col.Key === 'PRI');
      const fkColumns = table.columns.filter(col => col.Key === 'MUL');

      if (pkColumns.length > 0) {
        console.log(`  PK: ${pkColumns.map(col => col.Field).join(', ')}`);
      }

      if (fkColumns.length > 0) {
        console.log(`  FK: ${fkColumns.map(col => col.Field).join(', ')}`);
      }

      // 중요 컬럼 표시
      const importantColumns = table.columns.filter(
        col => col.Field.includes('_id') ||
               col.Field === 'email' ||
               col.Field === 'name' ||
               col.Field === 'status'
      );

      if (importantColumns.length > 0) {
        console.log(`  주요 컬럼: ${importantColumns.map(col => col.Field).join(', ')}`);
      }
    });

    await this.connection.end();
    console.log('\n✨ 스키마 확인 완료!\n');
  }
}

// 실행
const checker = new DatabaseSchemaChecker();
checker.checkAll().catch(error => {
  console.error('❌ 오류 발생:', error);
  process.exit(1);
});
