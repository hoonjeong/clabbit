const mysql = require('mysql2/promise');
require('dotenv').config();

const StudentAttendanceSettingsModel = require('./src/models/student-attendance-settings.model');
const AttendanceRecordModel = require('./src/models/attendance-record.model');

async function testCheckIn() {
    try {
        console.log('Testing check-in process...\n');

        const academyId = 1;
        const code = '10001';
        const method = 'kiosk';

        // Step 1: Find student
        console.log('Step 1: Finding student with code', code);
        const student = await StudentAttendanceSettingsModel.findStudentByCode(academyId, code);

        if (!student) {
            console.log('Student not found!');
            process.exit(1);
        }

        console.log('Student found:');
        console.log('  - ID:', student.student_id);
        console.log('  - Name:', student.student_name);
        console.log('  - Is session-based:', student.is_session_based);
        console.log('  - Full data:', JSON.stringify(student, null, 2));

        // Step 2: Try to check in
        console.log('\nStep 2: Attempting check-in...');
        console.log('  - academyId:', academyId);
        console.log('  - student_id:', student.student_id);
        console.log('  - method:', method);

        const result = await AttendanceRecordModel.checkIn(academyId, student.student_id, method);

        console.log('\nCheck-in result:', result);

    } catch (error) {
        console.error('\n❌ Error occurred:', error);
        console.error('Stack:', error.stack);
    } finally {
        // Exit the database connection
        const db = require('./src/config/database');
        await db.end();
        process.exit(0);
    }
}

testCheckIn();