const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs').promises;
const path = require('path');
const db = require('../config/database');
const { createWriteStream } = require('fs');
const Chart = require('chart.js');
const { createCanvas } = require('canvas');

class ReportService {
    constructor() {
        this.reportsDir = path.join(process.cwd(), 'reports');
        this.templatesDir = path.join(process.cwd(), 'report-templates');
        this.initDirectories();
    }

    async initDirectories() {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
            await fs.mkdir(this.templatesDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create report directories:', error);
        }
    }

    // ================== PDF 리포트 생성 ==================

    // 학생 성적표 PDF
    async generateStudentReportCard(academyId, studentId, options = {}) {
        const {
            startDate = new Date(new Date().getFullYear(), 0, 1),
            endDate = new Date(),
            includeAttendance = true,
            includePayments = true,
            includeConsultations = true
        } = options;

        try {
            // 데이터 수집
            const data = await this.collectStudentData(academyId, studentId, startDate, endDate);

            // PDF 생성
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `성적표 - ${data.student.name}`,
                    Author: '클래빗',
                    Subject: '학생 성적표',
                    Keywords: 'report, student, grades'
                }
            });

            const fileName = `student_${studentId}_report_${Date.now()}.pdf`;
            const filePath = path.join(this.reportsDir, fileName);
            const stream = createWriteStream(filePath);

            doc.pipe(stream);

            // 헤더
            await this.addPDFHeader(doc, data.academy);

            // 학생 정보
            this.addStudentInfo(doc, data.student);

            // 성적 섹션
            if (data.grades.length > 0) {
                doc.addPage();
                this.addGradesSection(doc, data.grades);
            }

            // 출석 섹션
            if (includeAttendance && data.attendance) {
                doc.addPage();
                this.addAttendanceSection(doc, data.attendance);
            }

            // 수납 섹션
            if (includePayments && data.payments.length > 0) {
                doc.addPage();
                this.addPaymentsSection(doc, data.payments);
            }

            // 상담 기록
            if (includeConsultations && data.consultations.length > 0) {
                doc.addPage();
                this.addConsultationsSection(doc, data.consultations);
            }

            // 푸터
            this.addPDFFooter(doc);

            doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    resolve({
                        success: true,
                        fileName,
                        filePath,
                        url: `/reports/${fileName}`
                    });
                });
                stream.on('error', reject);
            });

        } catch (error) {
            console.error('Generate student report card error:', error);
            throw error;
        }
    }

    // 월간 운영 리포트 PDF
    async generateMonthlyReport(academyId, year, month) {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);

            // 데이터 수집
            const data = await this.collectMonthlyData(academyId, startDate, endDate);

            // PDF 생성
            const doc = new PDFDocument({
                size: 'A4',
                layout: 'landscape',
                margin: 50
            });

            const fileName = `monthly_report_${year}_${String(month).padStart(2, '0')}.pdf`;
            const filePath = path.join(this.reportsDir, fileName);
            const stream = createWriteStream(filePath);

            doc.pipe(stream);

            // 표지
            this.addCoverPage(doc, data.academy, `${year}년 ${month}월 운영 리포트`);

            // 요약 대시보드
            doc.addPage();
            await this.addSummaryDashboard(doc, data.summary);

            // 학생 통계
            doc.addPage();
            this.addStudentStatistics(doc, data.studentStats);

            // 수업 현황
            doc.addPage();
            this.addClassStatistics(doc, data.classStats);

            // 재무 현황
            doc.addPage();
            this.addFinancialStatistics(doc, data.financialStats);

            // 교사 성과
            doc.addPage();
            this.addTeacherPerformance(doc, data.teacherStats);

            doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    resolve({
                        success: true,
                        fileName,
                        filePath,
                        url: `/reports/${fileName}`
                    });
                });
                stream.on('error', reject);
            });

        } catch (error) {
            console.error('Generate monthly report error:', error);
            throw error;
        }
    }

    // 재무 리포트 PDF
    async generateFinancialReport(academyId, startDate, endDate) {
        try {
            const data = await this.collectFinancialData(academyId, startDate, endDate);

            const doc = new PDFDocument({
                size: 'A4',
                margin: 50
            });

            const fileName = `financial_report_${Date.now()}.pdf`;
            const filePath = path.join(this.reportsDir, fileName);
            const stream = createWriteStream(filePath);

            doc.pipe(stream);

            // 표지
            this.addCoverPage(doc, data.academy, '재무 리포트');

            // 수익 개요
            doc.addPage();
            this.addRevenueOverview(doc, data.revenue);

            // 청구 및 수납 현황
            doc.addPage();
            this.addBillingStatus(doc, data.billing);

            // 미수금 현황
            doc.addPage();
            this.addOutstandingPayments(doc, data.outstanding);

            // 환불 내역
            if (data.refunds.length > 0) {
                doc.addPage();
                this.addRefundHistory(doc, data.refunds);
            }

            // 수익 추세 차트
            doc.addPage();
            await this.addRevenueChart(doc, data.revenueTrend);

            doc.end();

            return new Promise((resolve, reject) => {
                stream.on('finish', () => {
                    resolve({
                        success: true,
                        fileName,
                        filePath,
                        url: `/reports/${fileName}`
                    });
                });
                stream.on('error', reject);
            });

        } catch (error) {
            console.error('Generate financial report error:', error);
            throw error;
        }
    }

    // ================== Excel 리포트 생성 ==================

    // 학생 명단 Excel
    async generateStudentListExcel(academyId, options = {}) {
        const { status = 'all', includeGrades = false, includePayments = false } = options;

        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('학생 명단');

            // 학생 데이터 조회
            let query = `
                SELECT s.*, c.name as class_name
                FROM students s
                LEFT JOIN class_enrollments ce ON s.id = ce.student_id AND ce.status = 'active'
                LEFT JOIN classes c ON ce.class_id = c.id
                WHERE s.academy_id = ?
            `;
            const params = [academyId];

            if (status !== 'all') {
                query += ' AND s.status = ?';
                params.push(status);
            }

            const [students] = await db.execute(query, params);

            // 헤더 설정
            const headers = [
                '번호', '이름', '학년', '학교', '전화번호', '보호자 연락처',
                '수업', '상태', '등록일'
            ];

            if (includeGrades) {
                headers.push('최근 점수', '평균 점수');
            }

            if (includePayments) {
                headers.push('이번달 청구액', '미납금');
            }

            worksheet.addRow(headers);

            // 헤더 스타일링
            worksheet.getRow(1).font = { bold: true };
            worksheet.getRow(1).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };

            // 데이터 추가
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                const row = [
                    i + 1,
                    student.name,
                    student.grade,
                    student.school,
                    student.phone,
                    student.parent_phone,
                    student.class_name || '-',
                    student.status === 'active' ? '재원' : '퇴원',
                    new Date(student.created_at).toLocaleDateString('ko-KR')
                ];

                if (includeGrades) {
                    const gradeData = await this.getStudentGradesSummary(academyId, student.id);
                    row.push(gradeData.latest || '-', gradeData.average || '-');
                }

                if (includePayments) {
                    const paymentData = await this.getStudentPaymentSummary(academyId, student.id);
                    row.push(paymentData.currentMonth || 0, paymentData.outstanding || 0);
                }

                worksheet.addRow(row);
            }

            // 열 너비 자동 조정
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: false }, cell => {
                    const length = cell.value ? cell.value.toString().length : 0;
                    if (length > maxLength) {
                        maxLength = length;
                    }
                });
                column.width = Math.min(maxLength + 2, 50);
            });

            // 파일 저장
            const fileName = `student_list_${Date.now()}.xlsx`;
            const filePath = path.join(this.reportsDir, fileName);
            await workbook.xlsx.writeFile(filePath);

            return {
                success: true,
                fileName,
                filePath,
                url: `/reports/${fileName}`,
                rowCount: students.length
            };

        } catch (error) {
            console.error('Generate student list Excel error:', error);
            throw error;
        }
    }

    // 출석부 Excel
    async generateAttendanceExcel(academyId, classId, year, month) {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('출석부');

            // 수업 및 학생 정보 조회
            const [classInfo] = await db.execute(
                'SELECT * FROM classes WHERE id = ? AND academy_id = ?',
                [classId, academyId]
            );

            const [students] = await db.execute(
                `SELECT s.* FROM students s
                JOIN class_enrollments ce ON s.id = ce.student_id
                WHERE ce.class_id = ? AND ce.status = 'active'
                ORDER BY s.name`,
                [classId]
            );

            // 날짜 범위 설정
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0);
            const dates = [];

            for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                dates.push(new Date(d));
            }

            // 헤더 생성
            const headers = ['번호', '이름'];
            dates.forEach(date => {
                headers.push(date.getDate());
            });
            headers.push('출석', '결석', '지각', '출석률');

            worksheet.addRow(headers);

            // 출석 데이터 조회 및 추가
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                const row = [i + 1, student.name];

                let presentCount = 0;
                let absentCount = 0;
                let lateCount = 0;

                for (const date of dates) {
                    const [attendance] = await db.execute(
                        `SELECT status FROM attendance
                        WHERE academy_id = ? AND student_id = ? AND class_id = ? AND DATE(date) = ?`,
                        [academyId, student.id, classId, date.toISOString().split('T')[0]]
                    );

                    if (attendance.length > 0) {
                        const status = attendance[0].status;
                        if (status === 'present') {
                            row.push('○');
                            presentCount++;
                        } else if (status === 'absent') {
                            row.push('×');
                            absentCount++;
                        } else if (status === 'late') {
                            row.push('△');
                            lateCount++;
                        }
                    } else {
                        row.push('-');
                    }
                }

                const totalDays = presentCount + absentCount + lateCount;
                const attendanceRate = totalDays > 0
                    ? Math.round((presentCount / totalDays) * 100)
                    : 0;

                row.push(presentCount, absentCount, lateCount, `${attendanceRate}%`);
                worksheet.addRow(row);
            }

            // 스타일링
            this.styleAttendanceSheet(worksheet, dates.length);

            // 파일 저장
            const fileName = `attendance_${classId}_${year}${String(month).padStart(2, '0')}.xlsx`;
            const filePath = path.join(this.reportsDir, fileName);
            await workbook.xlsx.writeFile(filePath);

            return {
                success: true,
                fileName,
                filePath,
                url: `/reports/${fileName}`
            };

        } catch (error) {
            console.error('Generate attendance Excel error:', error);
            throw error;
        }
    }

    // ================== 데이터 수집 메서드 ==================

    async collectStudentData(academyId, studentId, startDate, endDate) {
        // 학원 정보
        const [academy] = await db.execute(
            'SELECT * FROM academies WHERE id = ?',
            [academyId]
        );

        // 학생 정보
        const [student] = await db.execute(
            'SELECT * FROM students WHERE id = ? AND academy_id = ?',
            [studentId, academyId]
        );

        // 성적 정보
        const [grades] = await db.execute(
            `SELECT g.*, e.name as exam_name, e.subject
            FROM grades g
            JOIN exams e ON g.exam_id = e.id
            WHERE g.student_id = ? AND g.academy_id = ?
            AND e.date BETWEEN ? AND ?
            ORDER BY e.date DESC`,
            [studentId, academyId, startDate, endDate]
        );

        // 출석 정보
        const [attendanceStats] = await db.execute(
            `SELECT
                COUNT(CASE WHEN status = 'present' THEN 1 END) as present_days,
                COUNT(CASE WHEN status = 'absent' THEN 1 END) as absent_days,
                COUNT(CASE WHEN status = 'late' THEN 1 END) as late_days,
                COUNT(*) as total_days
            FROM attendance
            WHERE student_id = ? AND academy_id = ?
            AND date BETWEEN ? AND ?`,
            [studentId, academyId, startDate, endDate]
        );

        // 수납 정보
        const [payments] = await db.execute(
            `SELECT * FROM payments
            WHERE student_id = ? AND academy_id = ?
            AND payment_date BETWEEN ? AND ?
            ORDER BY payment_date DESC`,
            [studentId, academyId, startDate, endDate]
        );

        // 상담 기록
        const [consultations] = await db.execute(
            `SELECT c.*, u.name as counselor_name
            FROM consultations c
            LEFT JOIN users u ON c.counselor_id = u.id
            WHERE c.student_id = ? AND c.academy_id = ?
            AND c.date BETWEEN ? AND ?
            ORDER BY c.date DESC`,
            [studentId, academyId, startDate, endDate]
        );

        return {
            academy: academy[0],
            student: student[0],
            grades,
            attendance: attendanceStats[0],
            payments,
            consultations
        };
    }

    async collectMonthlyData(academyId, startDate, endDate) {
        // 학원 정보
        const [academy] = await db.execute(
            'SELECT * FROM academies WHERE id = ?',
            [academyId]
        );

        // 요약 통계
        const summary = await this.getMonthlyS summary(academyId, startDate, endDate);

        // 학생 통계
        const studentStats = await this.getStudentStatistics(academyId, startDate, endDate);

        // 수업 통계
        const classStats = await this.getClassStatistics(academyId);

        // 재무 통계
        const financialStats = await this.getFinancialStatistics(academyId, startDate, endDate);

        // 교사 통계
        const teacherStats = await this.getTeacherStatistics(academyId, startDate, endDate);

        return {
            academy: academy[0],
            summary,
            studentStats,
            classStats,
            financialStats,
            teacherStats
        };
    }

    async collectFinancialData(academyId, startDate, endDate) {
        const [academy] = await db.execute(
            'SELECT * FROM academies WHERE id = ?',
            [academyId]
        );

        // 수익 데이터
        const [revenue] = await db.execute(
            `SELECT
                SUM(amount) as total_revenue,
                AVG(amount) as avg_payment,
                COUNT(*) as payment_count,
                COUNT(DISTINCT student_id) as unique_students
            FROM payments
            WHERE academy_id = ?
            AND payment_date BETWEEN ? AND ?
            AND status = 'completed'`,
            [academyId, startDate, endDate]
        );

        // 청구 데이터
        const [billing] = await db.execute(
            `SELECT
                SUM(final_amount) as total_billed,
                SUM(paid_amount) as total_paid,
                SUM(remaining_amount) as total_remaining,
                COUNT(*) as charge_count
            FROM charges
            WHERE academy_id = ?
            AND created_at BETWEEN ? AND ?`,
            [academyId, startDate, endDate]
        );

        // 미수금 상세
        const [outstanding] = await db.execute(
            `SELECT
                s.name as student_name,
                c.final_amount,
                c.remaining_amount,
                c.due_date,
                DATEDIFF(NOW(), c.due_date) as overdue_days
            FROM charges c
            JOIN students s ON c.student_id = s.id
            WHERE c.academy_id = ?
            AND c.remaining_amount > 0
            ORDER BY c.due_date`,
            [academyId]
        );

        // 환불 내역
        const [refunds] = await db.execute(
            `SELECT * FROM refunds
            WHERE academy_id = ?
            AND refund_date BETWEEN ? AND ?
            ORDER BY refund_date DESC`,
            [academyId, startDate, endDate]
        );

        // 수익 추세
        const revenueTrend = await this.getRevenueTrend(academyId, startDate, endDate);

        return {
            academy: academy[0],
            revenue: revenue[0],
            billing: billing[0],
            outstanding,
            refunds,
            revenueTrend
        };
    }

    // ================== PDF 섹션 메서드 ==================

    async addPDFHeader(doc, academy) {
        // 로고 (있는 경우)
        if (academy.logo_path) {
            try {
                doc.image(academy.logo_path, 50, 50, { width: 100 });
            } catch (error) {
                console.error('Failed to add logo:', error);
            }
        }

        // 학원명
        doc.fontSize(20)
            .font('fonts/NanumGothic-Bold.ttf')
            .text(academy.name, 200, 50);

        // 학원 정보
        doc.fontSize(10)
            .font('fonts/NanumGothic.ttf')
            .text(academy.address || '', 200, 80)
            .text(`Tel: ${academy.phone || ''}`, 200, 95)
            .text(`Email: ${academy.email || ''}`, 200, 110);

        // 구분선
        doc.moveTo(50, 140)
            .lineTo(550, 140)
            .stroke();

        doc.moveDown(2);
    }

    addStudentInfo(doc, student) {
        doc.fontSize(14)
            .font('fonts/NanumGothic-Bold.ttf')
            .text('학생 정보', 50, 160);

        doc.fontSize(10)
            .font('fonts/NanumGothic.ttf');

        const info = [
            ['이름', student.name],
            ['학년', student.grade],
            ['학교', student.school],
            ['전화번호', student.phone],
            ['보호자 연락처', student.parent_phone],
            ['등록일', new Date(student.created_at).toLocaleDateString('ko-KR')]
        ];

        let y = 190;
        info.forEach(([label, value]) => {
            doc.text(`${label}:`, 50, y, { continued: true })
                .text(`  ${value || '-'}`, 150, y);
            y += 20;
        });
    }

    addGradesSection(doc, grades) {
        doc.fontSize(14)
            .font('fonts/NanumGothic-Bold.ttf')
            .text('성적 기록', 50, 50);

        if (grades.length === 0) {
            doc.fontSize(10)
                .font('fonts/NanumGothic.ttf')
                .text('성적 기록이 없습니다.', 50, 80);
            return;
        }

        // 테이블 헤더
        const headers = ['날짜', '과목', '시험명', '점수', '등급', '석차'];
        const columnWidths = [80, 60, 150, 60, 50, 80];
        let x = 50;
        let y = 80;

        doc.fontSize(9)
            .font('fonts/NanumGothic-Bold.ttf');

        headers.forEach((header, i) => {
            doc.text(header, x, y, { width: columnWidths[i], align: 'center' });
            x += columnWidths[i];
        });

        // 테이블 데이터
        doc.font('fonts/NanumGothic.ttf');
        y += 20;

        grades.forEach(grade => {
            x = 50;
            doc.text(new Date(grade.date).toLocaleDateString('ko-KR'), x, y, { width: columnWidths[0] });
            x += columnWidths[0];
            doc.text(grade.subject, x, y, { width: columnWidths[1], align: 'center' });
            x += columnWidths[1];
            doc.text(grade.exam_name, x, y, { width: columnWidths[2] });
            x += columnWidths[2];
            doc.text(String(grade.score), x, y, { width: columnWidths[3], align: 'center' });
            x += columnWidths[3];
            doc.text(grade.grade || '-', x, y, { width: columnWidths[4], align: 'center' });
            x += columnWidths[4];
            doc.text(grade.rank ? `${grade.rank}/${grade.total_students}` : '-', x, y, { width: columnWidths[5], align: 'center' });

            y += 18;

            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });
    }

    addPDFFooter(doc) {
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);

            // 페이지 번호
            doc.fontSize(8)
                .text(
                    `${i + 1} / ${pages.count}`,
                    50,
                    doc.page.height - 50,
                    { align: 'center' }
                );

            // 생성 일시
            doc.text(
                `생성일시: ${new Date().toLocaleString('ko-KR')}`,
                50,
                doc.page.height - 35,
                { align: 'center' }
            );

            // 워터마크
            doc.fontSize(6)
                .opacity(0.3)
                .text('Powered by 클래빗', 50, doc.page.height - 20, { align: 'center' })
                .opacity(1);
        }
    }

    // ================== Helper Methods ==================

    async getStudentGradesSummary(academyId, studentId) {
        const [latest] = await db.execute(
            `SELECT score FROM grades
            WHERE academy_id = ? AND student_id = ?
            ORDER BY created_at DESC LIMIT 1`,
            [academyId, studentId]
        );

        const [average] = await db.execute(
            `SELECT AVG(score) as avg_score FROM grades
            WHERE academy_id = ? AND student_id = ?`,
            [academyId, studentId]
        );

        return {
            latest: latest[0]?.score,
            average: average[0]?.avg_score ? Math.round(average[0].avg_score) : null
        };
    }

    async getStudentPaymentSummary(academyId, studentId) {
        const currentMonth = new Date();
        const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

        const [current] = await db.execute(
            `SELECT SUM(final_amount) as total FROM charges
            WHERE academy_id = ? AND student_id = ?
            AND created_at BETWEEN ? AND ?`,
            [academyId, studentId, startOfMonth, endOfMonth]
        );

        const [outstanding] = await db.execute(
            `SELECT SUM(remaining_amount) as total FROM charges
            WHERE academy_id = ? AND student_id = ?
            AND remaining_amount > 0`,
            [academyId, studentId]
        );

        return {
            currentMonth: current[0]?.total || 0,
            outstanding: outstanding[0]?.total || 0
        };
    }

    styleAttendanceSheet(worksheet, daysCount) {
        // 헤더 스타일
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // 테두리 추가
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // 출석 상태 셀 색상
        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.eachCell((cell, colNumber) => {
                    if (colNumber > 2 && colNumber <= 2 + daysCount) {
                        if (cell.value === '○') {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FF90EE90' }
                            };
                        } else if (cell.value === '×') {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFB6C1' }
                            };
                        } else if (cell.value === '△') {
                            cell.fill = {
                                type: 'pattern',
                                pattern: 'solid',
                                fgColor: { argb: 'FFFFD700' }
                            };
                        }
                    }
                });
            }
        });

        // 열 너비 조정
        worksheet.getColumn(1).width = 5;
        worksheet.getColumn(2).width = 15;
        for (let i = 3; i <= 2 + daysCount; i++) {
            worksheet.getColumn(i).width = 4;
        }
    }

    async getRevenueTrend(academyId, startDate, endDate) {
        const trend = [];
        const current = new Date(startDate);

        while (current <= endDate) {
            const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
            const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);

            const [revenue] = await db.execute(
                `SELECT SUM(amount) as total FROM payments
                WHERE academy_id = ?
                AND payment_date BETWEEN ? AND ?
                AND status = 'completed'`,
                [academyId, monthStart, monthEnd]
            );

            trend.push({
                month: current.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
                revenue: revenue[0]?.total || 0
            });

            current.setMonth(current.getMonth() + 1);
        }

        return trend;
    }
}

module.exports = new ReportService();