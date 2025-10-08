const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * 기존 students 데이터를 student_events로 마이그레이션
 *
 * 마이그레이션 로직:
 * 1. 재원생 (status = 'active') -> join 이벤트 생성
 * 2. 퇴원생 (status = 'withdrawn') -> join + exit 이벤트 생성
 */
async function migrateStudentEvents() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('✅ 데이터베이스 연결 성공\n');

    // 기존 이벤트 데이터 확인
    const [[{ existingCount }]] = await connection.execute(
      'SELECT COUNT(*) as existingCount FROM student_events'
    );

    if (existingCount > 0) {
      console.log(`⚠️  기존 이벤트 데이터 ${existingCount}건 발견`);
      console.log('기존 데이터를 삭제하고 다시 마이그레이션하려면 다음 쿼리를 실행하세요:');
      console.log('DELETE FROM student_events;\n');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('기존 데이터를 삭제하고 계속하시겠습니까? (yes/no): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'yes') {
        console.log('\n취소되었습니다.');
        return;
      }

      await connection.execute('DELETE FROM student_events');
      console.log('✅ 기존 이벤트 데이터 삭제 완료\n');
    }

    // 1. 재원생 (active) - join 이벤트 생성
    console.log('📝 재원생 join 이벤트 생성 중...');
    const [activeStudents] = await connection.execute(`
      SELECT id, academy_id, enrollment_date
      FROM students
      WHERE status = 'active'
    `);

    let activeCount = 0;
    for (const student of activeStudents) {
      await connection.execute(`
        INSERT INTO student_events
        (academy_id, student_id, event_type, event_date)
        VALUES (?, ?, 'join', ?)
      `, [student.academy_id, student.id, student.enrollment_date]);
      activeCount++;
    }

    console.log(`✅ 재원생 ${activeCount}명 join 이벤트 생성 완료\n`);

    // 2. 퇴원생 (withdrawn) - join + exit 이벤트 생성
    console.log('📝 퇴원생 join/exit 이벤트 생성 중...');
    const [withdrawnStudents] = await connection.execute(`
      SELECT id, academy_id, enrollment_date, withdrawal_date
      FROM students
      WHERE status = 'withdrawn' AND withdrawal_date IS NOT NULL
    `);

    let withdrawnCount = 0;
    for (const student of withdrawnStudents) {
      // join 이벤트
      await connection.execute(`
        INSERT INTO student_events
        (academy_id, student_id, event_type, event_date)
        VALUES (?, ?, 'join', ?)
      `, [student.academy_id, student.id, student.enrollment_date]);

      // exit 이벤트
      await connection.execute(`
        INSERT INTO student_events
        (academy_id, student_id, event_type, event_date)
        VALUES (?, ?, 'exit', ?)
      `, [student.academy_id, student.id, student.withdrawal_date]);

      withdrawnCount++;
    }

    console.log(`✅ 퇴원생 ${withdrawnCount}명 join/exit 이벤트 생성 완료\n`);

    // 결과 확인
    const [[{ totalEvents }]] = await connection.execute(
      'SELECT COUNT(*) as totalEvents FROM student_events'
    );

    console.log('📊 마이그레이션 결과:');
    console.log(`   - 재원생: ${activeCount}명 (join 이벤트 ${activeCount}건)`);
    console.log(`   - 퇴원생: ${withdrawnCount}명 (join/exit 이벤트 ${withdrawnCount * 2}건)`);
    console.log(`   - 전체 이벤트: ${totalEvents}건\n`);

    // 학원별 통계 확인
    const [academyStats] = await connection.execute(`
      SELECT
        a.name as academy_name,
        SUM(CASE WHEN se.event_type IN ('join', 'rejoin') THEN 1 ELSE 0 END) as join_count,
        SUM(CASE WHEN se.event_type = 'exit' THEN 1 ELSE 0 END) as exit_count
      FROM academies a
      LEFT JOIN student_events se ON a.id = se.academy_id
      GROUP BY a.id, a.name
    `);

    console.log('📊 학원별 이벤트 통계:');
    console.table(academyStats);

  } catch (error) {
    console.error('\n❌ 마이그레이션 오류:', error.message);
    throw error;
  } finally {
    await connection.end();
    console.log('✅ 데이터베이스 연결 종료');
  }
}

// 실행
migrateStudentEvents()
  .then(() => {
    console.log('\n🎉 마이그레이션 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 마이그레이션 실패:', error);
    process.exit(1);
  });
