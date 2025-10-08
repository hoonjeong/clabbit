const nodemailer = require('nodemailer');
const twilio = require('twilio');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const db = require('../config/database');
const crypto = require('crypto');

class NotificationServiceV2 {
    constructor() {
        // Email configuration (Nodemailer)
        this.emailTransporter = nodemailer.createTransporter({
            service: process.env.EMAIL_SERVICE || 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // SMS configuration (Twilio)
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
            this.twilioFromNumber = process.env.TWILIO_PHONE_NUMBER;
        }

        // SendGrid configuration for bulk emails
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.sgMail = sgMail;
        }

        // Firebase Admin configuration for push notifications
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            try {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
                this.fcm = admin.messaging();
            } catch (error) {
                console.error('Firebase initialization failed:', error);
            }
        }

        // Notification templates
        this.templates = {
            email: {
                welcome: {
                    subject: '클래빗에 오신 것을 환영합니다!',
                    html: (data) => `
                        <h2>안녕하세요 ${data.name}님!</h2>
                        <p>클래빗 ${data.academyName} 학원에 등록되셨습니다.</p>
                        <p>앞으로 학습 일정, 성적 정보 등을 받아보실 수 있습니다.</p>
                    `
                },
                payment_reminder: {
                    subject: '수강료 납부 안내',
                    html: (data) => `
                        <h2>${data.studentName} 학생 수강료 안내</h2>
                        <p>납부 기한: ${data.dueDate}</p>
                        <p>납부 금액: ${data.amount.toLocaleString()}원</p>
                    `
                },
                class_reminder: {
                    subject: '수업 일정 안내',
                    html: (data) => `
                        <h2>오늘의 수업 일정</h2>
                        <p>수업명: ${data.className}</p>
                        <p>시간: ${data.time}</p>
                        <p>교실: ${data.room}</p>
                    `
                },
                grade_report: {
                    subject: '성적 통지표',
                    html: (data) => `
                        <h2>${data.studentName} 학생 성적 안내</h2>
                        <p>시험: ${data.examName}</p>
                        <p>점수: ${data.score}점</p>
                        <p>등급: ${data.grade}</p>
                    `
                }
            },
            sms: {
                welcome: (data) => `[클래빗] ${data.name}님 환영합니다! ${data.academyName} 학원`,
                payment_reminder: (data) => `[클래빗] ${data.studentName} 수강료 ${data.amount}원, 납부기한 ${data.dueDate}`,
                attendance: (data) => `[클래빗] ${data.studentName} ${data.status === 'present' ? '출석' : '결석'} ${data.time}`,
                class_reminder: (data) => `[클래빗] 오늘 ${data.time} ${data.className} 수업입니다`
            },
            push: {
                welcome: {
                    title: '환영합니다!',
                    body: (data) => `${data.academyName} 학원에 등록되었습니다`
                },
                payment_reminder: {
                    title: '수강료 납부 안내',
                    body: (data) => `${data.amount.toLocaleString()}원 납부 기한: ${data.dueDate}`
                },
                message: {
                    title: '새 메시지',
                    body: (data) => data.message
                }
            }
        };
    }

    // 통합 알림 전송
    async send(academyId, options) {
        const {
            userId,
            type,
            channel,
            template,
            data,
            priority = 'normal',
            scheduledAt = null
        } = options;

        try {
            // 알림 기록 저장
            const notificationId = await this.saveNotification({
                academyId,
                userId,
                type: channel,
                template,
                data,
                priority,
                scheduledAt
            });

            // 예약 알림인 경우 처리
            if (scheduledAt && new Date(scheduledAt) > new Date()) {
                return { success: true, notificationId, scheduled: true };
            }

            // 채널별 전송
            let result;
            switch (channel) {
                case 'email':
                    result = await this.sendEmail(userId, template, data);
                    break;
                case 'sms':
                    result = await this.sendSMS(userId, template, data);
                    break;
                case 'push':
                    result = await this.sendPush(userId, template, data);
                    break;
                case 'in_app':
                    result = await this.sendInApp(academyId, userId, template, data);
                    break;
                default:
                    throw new Error(`Unsupported channel: ${channel}`);
            }

            // 전송 결과 업데이트
            await this.updateNotificationStatus(notificationId, result.success ? 'sent' : 'failed');

            return { success: true, notificationId, result };
        } catch (error) {
            console.error('Notification send error:', error);
            throw error;
        }
    }

    // 이메일 전송
    async sendEmail(userId, template, data) {
        try {
            // 사용자 이메일 조회
            const [users] = await db.execute(
                'SELECT email, name FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length || !users[0].email) {
                throw new Error('User email not found');
            }

            const emailTemplate = this.templates.email[template];
            if (!emailTemplate) {
                throw new Error(`Email template not found: ${template}`);
            }

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@clabbit.com',
                to: users[0].email,
                subject: emailTemplate.subject,
                html: emailTemplate.html({ ...data, name: users[0].name })
            };

            const info = await this.emailTransporter.sendMail(mailOptions);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('Email send error:', error);
            return { success: false, error: error.message };
        }
    }

    // SMS 전송
    async sendSMS(userId, template, data) {
        if (!this.twilioClient) {
            return { success: false, error: 'Twilio not configured' };
        }

        try {
            // 사용자 전화번호 조회
            const [users] = await db.execute(
                'SELECT phone, name FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length || !users[0].phone) {
                throw new Error('User phone not found');
            }

            const smsTemplate = this.templates.sms[template];
            if (!smsTemplate) {
                throw new Error(`SMS template not found: ${template}`);
            }

            const message = await this.twilioClient.messages.create({
                body: smsTemplate({ ...data, name: users[0].name }),
                from: this.twilioFromNumber,
                to: users[0].phone
            });

            return { success: true, sid: message.sid };
        } catch (error) {
            console.error('SMS send error:', error);
            return { success: false, error: error.message };
        }
    }

    // Push 알림 전송
    async sendPush(userId, template, data) {
        if (!this.fcm) {
            return { success: false, error: 'Firebase not configured' };
        }

        try {
            // 사용자 FCM 토큰 조회
            const [tokens] = await db.execute(
                'SELECT token FROM user_push_tokens WHERE user_id = ? AND active = true',
                [userId]
            );

            if (!tokens.length) {
                throw new Error('No active push tokens found');
            }

            const pushTemplate = this.templates.push[template];
            if (!pushTemplate) {
                throw new Error(`Push template not found: ${template}`);
            }

            const message = {
                notification: {
                    title: pushTemplate.title,
                    body: typeof pushTemplate.body === 'function'
                        ? pushTemplate.body(data)
                        : pushTemplate.body
                },
                data: {
                    template,
                    ...Object.keys(data).reduce((acc, key) => {
                        acc[key] = String(data[key]);
                        return acc;
                    }, {})
                },
                tokens: tokens.map(t => t.token)
            };

            const response = await this.fcm.sendMulticast(message);
            return {
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
        } catch (error) {
            console.error('Push send error:', error);
            return { success: false, error: error.message };
        }
    }

    // 인앱 알림 전송
    async sendInApp(academyId, userId, template, data) {
        try {
            const query = `
                INSERT INTO in_app_notifications
                (academy_id, user_id, type, title, message, data, is_read)
                VALUES (?, ?, ?, ?, ?, ?, false)
            `;

            const title = this.templates.push[template]?.title || template;
            const message = typeof this.templates.push[template]?.body === 'function'
                ? this.templates.push[template].body(data)
                : data.message || '';

            const [result] = await db.execute(query, [
                academyId,
                userId,
                template,
                title,
                message,
                JSON.stringify(data)
            ]);

            // WebSocket으로 실시간 전송 (Socket.io 연동)
            const io = global.io;
            if (io) {
                io.to(`user_${userId}`).emit('notification', {
                    id: result.insertId,
                    type: template,
                    title,
                    message,
                    data,
                    createdAt: new Date()
                });
            }

            return { success: true, notificationId: result.insertId };
        } catch (error) {
            console.error('In-app notification error:', error);
            return { success: false, error: error.message };
        }
    }

    // 대량 알림 전송
    async sendBulk(academyId, options) {
        const {
            userIds,
            channel,
            template,
            data,
            priority = 'normal'
        } = options;

        // SendGrid를 사용한 대량 이메일
        if (channel === 'email' && this.sgMail && userIds.length > 10) {
            return await this.sendBulkEmail(userIds, template, data);
        }

        // 일반 병렬 전송
        const promises = userIds.map(userId =>
            this.send(academyId, {
                userId,
                type: 'bulk',
                channel,
                template,
                data,
                priority
            }).catch(error => ({
                success: false,
                userId,
                error: error.message
            }))
        );

        const results = await Promise.all(promises);

        return {
            success: true,
            total: userIds.length,
            succeeded: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results
        };
    }

    // SendGrid 대량 이메일
    async sendBulkEmail(userIds, template, data) {
        try {
            // 사용자 이메일 조회
            const placeholders = userIds.map(() => '?').join(',');
            const [users] = await db.execute(
                `SELECT id, email, name FROM users WHERE id IN (${placeholders}) AND email IS NOT NULL`,
                userIds
            );

            const emailTemplate = this.templates.email[template];
            if (!emailTemplate) {
                throw new Error(`Email template not found: ${template}`);
            }

            const personalizations = users.map(user => ({
                to: [{ email: user.email, name: user.name }],
                dynamic_template_data: {
                    ...data,
                    name: user.name,
                    userId: user.id
                }
            }));

            const msg = {
                from: process.env.SENDGRID_FROM_EMAIL || 'noreply@clabbit.com',
                subject: emailTemplate.subject,
                html: emailTemplate.html(data),
                personalizations,
                mail_settings: {
                    sandbox_mode: {
                        enable: process.env.NODE_ENV === 'development'
                    }
                }
            };

            await this.sgMail.send(msg);

            return {
                success: true,
                total: users.length,
                succeeded: users.length,
                failed: 0
            };
        } catch (error) {
            console.error('Bulk email error:', error);
            throw error;
        }
    }

    // 알림 기록 저장
    async saveNotification(data) {
        const query = `
            INSERT INTO notifications
            (academy_id, user_id, type, template, data, priority, scheduled_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        const [result] = await db.execute(query, [
            data.academyId,
            data.userId,
            data.type,
            data.template,
            JSON.stringify(data.data),
            data.priority,
            data.scheduledAt
        ]);

        return result.insertId;
    }

    // 알림 상태 업데이트
    async updateNotificationStatus(notificationId, status) {
        const query = `
            UPDATE notifications
            SET status = ?, sent_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;

        await db.execute(query, [status, notificationId]);
    }

    // 예약 알림 처리
    async processScheduledNotifications() {
        const query = `
            SELECT * FROM notifications
            WHERE status = 'pending'
            AND scheduled_at <= NOW()
            ORDER BY priority DESC, scheduled_at ASC
            LIMIT 100
        `;

        const [notifications] = await db.execute(query);

        for (const notification of notifications) {
            try {
                const data = JSON.parse(notification.data);
                await this.send(notification.academy_id, {
                    userId: notification.user_id,
                    type: notification.template,
                    channel: notification.type,
                    template: notification.template,
                    data,
                    priority: notification.priority
                });
            } catch (error) {
                console.error(`Failed to send scheduled notification ${notification.id}:`, error);
                await this.updateNotificationStatus(notification.id, 'failed');
            }
        }
    }

    // 알림 설정 조회
    async getUserPreferences(userId) {
        const query = `
            SELECT * FROM user_notification_preferences
            WHERE user_id = ?
        `;

        const [preferences] = await db.execute(query, [userId]);

        if (!preferences.length) {
            // 기본 설정 반환
            return {
                email: true,
                sms: true,
                push: true,
                in_app: true,
                payment_reminder: true,
                class_reminder: true,
                grade_notification: true,
                attendance_notification: true
            };
        }

        return preferences[0];
    }

    // 알림 설정 업데이트
    async updateUserPreferences(userId, preferences) {
        const query = `
            INSERT INTO user_notification_preferences
            (user_id, email, sms, push, in_app,
             payment_reminder, class_reminder,
             grade_notification, attendance_notification)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
            email = VALUES(email),
            sms = VALUES(sms),
            push = VALUES(push),
            in_app = VALUES(in_app),
            payment_reminder = VALUES(payment_reminder),
            class_reminder = VALUES(class_reminder),
            grade_notification = VALUES(grade_notification),
            attendance_notification = VALUES(attendance_notification)
        `;

        await db.execute(query, [
            userId,
            preferences.email,
            preferences.sms,
            preferences.push,
            preferences.in_app,
            preferences.payment_reminder,
            preferences.class_reminder,
            preferences.grade_notification,
            preferences.attendance_notification
        ]);

        return preferences;
    }

    // 알림 통계
    async getNotificationStats(academyId, startDate, endDate) {
        const query = `
            SELECT
                type,
                status,
                COUNT(*) as count,
                DATE(created_at) as date
            FROM notifications
            WHERE academy_id = ?
            AND created_at BETWEEN ? AND ?
            GROUP BY type, status, DATE(created_at)
            ORDER BY date DESC
        `;

        const [stats] = await db.execute(query, [academyId, startDate, endDate]);

        return {
            total: stats.reduce((sum, s) => sum + s.count, 0),
            byType: this.groupByType(stats),
            byStatus: this.groupByStatus(stats),
            byDate: this.groupByDate(stats)
        };
    }

    groupByType(stats) {
        return stats.reduce((acc, stat) => {
            if (!acc[stat.type]) acc[stat.type] = 0;
            acc[stat.type] += stat.count;
            return acc;
        }, {});
    }

    groupByStatus(stats) {
        return stats.reduce((acc, stat) => {
            if (!acc[stat.status]) acc[stat.status] = 0;
            acc[stat.status] += stat.count;
            return acc;
        }, {});
    }

    groupByDate(stats) {
        return stats.reduce((acc, stat) => {
            const dateKey = stat.date.toISOString().split('T')[0];
            if (!acc[dateKey]) acc[dateKey] = { sent: 0, failed: 0, pending: 0 };
            acc[dateKey][stat.status] = (acc[dateKey][stat.status] || 0) + stat.count;
            return acc;
        }, {});
    }
}

module.exports = new NotificationServiceV2();