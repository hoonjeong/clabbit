const nodemailer = require('nodemailer');
const db = require('../config/database');
const createLogger = require('../utils/logger');

const logger = createLogger('NotificationService');

class NotificationService {
    constructor() {
        // 이메일 전송 설정
        this.emailTransporter = null;
        this.initEmailTransporter();

        // SMS 설정 (추후 구현)
        this.smsClient = null;

        // 카카오톡 알림 설정 (추후 구현)
        this.kakaoClient = null;
    }

    /**
     * 이메일 전송기 초기화
     */
    initEmailTransporter() {
        if (process.env.SMTP_HOST) {
            this.emailTransporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: process.env.SMTP_PORT || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            logger.info('이메일 전송기 초기화 완료');
        } else {
            logger.warn('SMTP 설정이 없습니다. 이메일 알림이 비활성화됩니다.');
        }
    }

    /**
     * 청구 생성 알림
     */
    async sendChargeCreatedNotification(academyId, charges) {
        try {
            // 학원 정보 조회
            const [academyResult] = await db.execute(
                'SELECT name FROM academies WHERE id = ?',
                [academyId]
            );
            const academyName = academyResult[0]?.name || '학원';

            // 학생별로 그룹화
            const studentCharges = new Map();
            for (const charge of charges) {
                if (!studentCharges.has(charge.student_id)) {
                    studentCharges.set(charge.student_id, []);
                }
                studentCharges.get(charge.student_id).push(charge);
            }

            // 각 학생에게 알림 발송
            for (const [studentId, studentChargeList] of studentCharges) {
                await this.sendStudentChargeNotification(
                    academyId,
                    academyName,
                    studentId,
                    studentChargeList
                );
            }

            return true;
        } catch (error) {
            logger.error('청구 생성 알림 발송 오류:', error);
            return false;
        }
    }

    /**
     * 개별 학생 청구 알림
     */
    async sendStudentChargeNotification(academyId, academyName, studentId, charges) {
        try {
            // 학생 정보 조회
            const [studentResult] = await db.execute(
                'SELECT name, phone, parent_phone FROM students WHERE id = ? AND academy_id = ?',
                [studentId, academyId]
            );

            if (!studentResult[0]) return false;

            const student = studentResult[0];
            const totalAmount = charges.reduce((sum, c) => sum + (c.amount - c.discount_amount), 0);

            // 메시지 생성
            const message = `[${academyName}]
안녕하세요, ${student.name} 학생 보호자님.

${new Date().getMonth() + 1}월 청구 안내드립니다.

▶ 청구 항목: ${charges.length}건
▶ 총 청구액: ₩${totalAmount.toLocaleString()}
▶ 납부 기한: ${charges[0].due_date || '추후 안내'}

자세한 내용은 학원에 문의해주세요.
감사합니다.`;

            // 알림 발송 (현재는 로그만)
            await this.logNotification(academyId, studentId, 'charge_created', 'sms', message, student.parent_phone || student.phone);

            return true;
        } catch (error) {
            logger.error('학생 청구 알림 발송 오류:', error);
            return false;
        }
    }

    /**
     * 미납 알림 발송
     */
    async sendUnpaidReminder(academyId, studentId, data) {
        try {
            // 학원 정보 조회
            const [academyResult] = await db.execute(
                'SELECT name FROM academies WHERE id = ?',
                [academyId]
            );
            const academyName = academyResult[0]?.name || '학원';

            const totalUnpaid = data.charges.reduce((sum, c) => sum + (c.remaining_amount || c.final_amount), 0);

            // 메시지 생성
            const message = `[${academyName}]
안녕하세요, ${data.student_name} 학생 보호자님.

미납금 안내드립니다.

▶ 미납 건수: ${data.charges.length}건
▶ 총 미납액: ₩${totalUnpaid.toLocaleString()}
▶ 최초 납부기한: ${data.charges[0].due_date}

빠른 납부 부탁드립니다.
감사합니다.`;

            // 알림 발송
            const recipient = data.parent_phone || data.student_phone;
            await this.logNotification(academyId, studentId, 'payment_reminder', 'sms', message, recipient);

            return true;
        } catch (error) {
            logger.error('미납 알림 발송 오류:', error);
            return false;
        }
    }

    /**
     * 수납 완료 알림
     */
    async sendPaymentReceivedNotification(academyId, paymentData) {
        try {
            // 학원 정보 조회
            const [academyResult] = await db.execute(
                'SELECT name FROM academies WHERE id = ?',
                [academyId]
            );
            const academyName = academyResult[0]?.name || '학원';

            // 학생 정보 조회
            const [studentResult] = await db.execute(
                'SELECT name, phone, parent_phone FROM students WHERE id = ? AND academy_id = ?',
                [paymentData.student_id, academyId]
            );

            if (!studentResult[0]) return false;

            const student = studentResult[0];

            // 메시지 생성
            const message = `[${academyName}]
안녕하세요, ${student.name} 학생 보호자님.

수납이 완료되었습니다.

▶ 수납액: ₩${paymentData.amount.toLocaleString()}
▶ 수납일시: ${new Date(paymentData.payment_date).toLocaleString('ko-KR')}
▶ 수납방법: ${this.getPaymentMethodText(paymentData.payment_method)}
▶ 영수증번호: ${paymentData.receipt_number}

감사합니다.`;

            // 알림 발송
            const recipient = student.parent_phone || student.phone;
            await this.logNotification(academyId, paymentData.student_id, 'payment_received', 'sms', message, recipient);

            return true;
        } catch (error) {
            logger.error('수납 완료 알림 발송 오류:', error);
            return false;
        }
    }

    /**
     * 월별 리포트 발송
     */
    async sendMonthlyReport(academyId, report) {
        try {
            // 학원 관리자 이메일 조회
            const [admins] = await db.execute(`
                SELECT u.email, u.name
                FROM users u
                JOIN user_academy_roles uar ON u.id = uar.user_id
                WHERE uar.academy_id = ?
                AND uar.role IN ('owner', 'admin')
                AND u.is_active = TRUE
            `, [academyId]);

            if (admins.length === 0) {
                logger.warn(`학원 ${academyId}의 관리자를 찾을 수 없습니다.`);
                return false;
            }

            // HTML 리포트 생성
            const html = this.generateReportHTML(report);

            // 각 관리자에게 이메일 발송
            for (const admin of admins) {
                await this.sendEmail(
                    admin.email,
                    `[${report.academy_name}] ${report.month} 월별 청구/수납 리포트`,
                    html
                );

                logger.info(`리포트 발송 완료: ${admin.email}`);
            }

            return true;
        } catch (error) {
            logger.error('월별 리포트 발송 오류:', error);
            return false;
        }
    }

    /**
     * 리포트 HTML 생성
     */
    generateReportHTML(report) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Malgun Gothic', sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .stat-label { color: #666; font-size: 14px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #333; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${report.academy_name} - ${report.month} 월별 리포트</h1>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">총 청구액</div>
                <div class="stat-value">₩${(report.charge_stats.total_final_amount || 0).toLocaleString()}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">총 수납액</div>
                <div class="stat-value">₩${(report.payment_stats.total_amount || 0).toLocaleString()}</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">수납율</div>
                <div class="stat-value">${report.collection_rate}%</div>
            </div>

            <div class="stat-card">
                <div class="stat-label">미수금</div>
                <div class="stat-value">₩${(report.charge_stats.total_remaining || 0).toLocaleString()}</div>
            </div>
        </div>

        <h3>상세 내역</h3>
        <ul>
            <li>청구 건수: ${report.charge_stats.total_charges}건</li>
            <li>수납 건수: ${report.payment_stats.payment_count}건</li>
            <li>미납 건수: ${report.charge_stats.pending_count}건</li>
            <li>연체 건수: ${report.charge_stats.overdue_count}건</li>
        </ul>

        <h3>수납 방법별 현황</h3>
        <ul>
            <li>현금: ₩${(report.payment_stats.cash_amount || 0).toLocaleString()}</li>
            <li>카드: ₩${(report.payment_stats.card_amount || 0).toLocaleString()}</li>
            <li>계좌이체: ₩${(report.payment_stats.transfer_amount || 0).toLocaleString()}</li>
        </ul>

        <div class="footer">
            <p>생성일시: ${new Date(report.generated_at).toLocaleString('ko-KR')}</p>
            <p>이 리포트는 자동으로 생성되었습니다.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    /**
     * 이메일 발송
     */
    async sendEmail(to, subject, html) {
        if (!this.emailTransporter) {
            logger.warn('이메일 전송기가 설정되지 않았습니다.');
            return false;
        }

        try {
            const info = await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@clabbit.com',
                to: to,
                subject: subject,
                html: html
            });

            logger.info('이메일 발송 완료:', info.messageId);
            return true;
        } catch (error) {
            logger.error('이메일 발송 오류:', error);
            return false;
        }
    }

    /**
     * 알림 로그 기록
     */
    async logNotification(academyId, studentId, type, channel, message, recipient) {
        try {
            await db.execute(`
                INSERT INTO billing_notifications (
                    academy_id, student_id, type, channel,
                    recipient, message, status, sent_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'sent', NOW())
            `, [academyId, studentId, type, channel, recipient, message]);

            logger.info(`알림 발송 로그 기록: ${type} to ${recipient}`);
        } catch (error) {
            logger.error('알림 로그 기록 오류:', error);
        }
    }

    /**
     * 수납 방법 텍스트 변환
     */
    getPaymentMethodText(method) {
        const methodMap = {
            'cash': '현금',
            'card': '카드',
            'transfer': '계좌이체',
            'auto_transfer': '자동이체',
            'other': '기타'
        };
        return methodMap[method] || method;
    }

    /**
     * 대량 SMS 발송
     */
    async sendBulkSMS(academyId, recipients, message) {
        try {
            const results = [];

            for (const recipient of recipients) {
                const result = await this.logNotification(
                    academyId,
                    recipient.student_id,
                    'bulk_sms',
                    'sms',
                    message,
                    recipient.phone
                );
                results.push({
                    student_id: recipient.student_id,
                    success: result
                });
            }

            logger.info(`대량 SMS 발송 완료: ${results.filter(r => r.success).length}/${recipients.length}`);
            return results;
        } catch (error) {
            logger.error('대량 SMS 발송 오류:', error);
            return [];
        }
    }
}

module.exports = new NotificationService();