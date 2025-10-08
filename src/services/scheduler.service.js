const cron = require('node-cron');
const db = require('../config/database');
const BillingItemModel = require('../models/billing-item.model');
const StudentChargeModel = require('../models/student-charge.model');
const StudentModel = require('../models/student.model');
const NotificationService = require('./notification.service');
const createLogger = require('../utils/logger');

const logger = createLogger('SchedulerService');

class SchedulerService {
    constructor() {
        this.jobs = new Map();
        this.isRunning = false;
    }

    /**
     * 스케줄러 시작
     */
    start() {
        if (this.isRunning) {
            logger.info('스케줄러가 이미 실행중입니다.');
            return;
        }

        this.isRunning = true;
        logger.info('청구 스케줄러 시작');

        // 매일 오전 9시에 자동 청구 생성 체크
        this.scheduleJob('daily-charge-check', '0 9 * * *', () => {
            this.processRecurringCharges();
        });

        // 매일 오후 2시에 미납 알림 발송
        this.scheduleJob('unpaid-reminder', '0 14 * * *', () => {
            this.sendUnpaidReminders();
        });

        // 매월 1일 오전 10시에 월별 리포트 생성
        this.scheduleJob('monthly-report', '0 10 1 * *', () => {
            this.generateMonthlyReport();
        });

        // 테스트용: 5분마다 실행 (프로덕션에서는 제거)
        if (process.env.NODE_ENV === 'development') {
            this.scheduleJob('test-job', '*/5 * * * *', () => {
                logger.info('스케줄러 테스트 실행');
            });
        }
    }

    /**
     * 스케줄러 중지
     */
    stop() {
        this.jobs.forEach((job, name) => {
            job.stop();
            logger.info(`Job ${name} 중지됨`);
        });
        this.jobs.clear();
        this.isRunning = false;
        logger.info('청구 스케줄러 중지');
    }

    /**
     * 개별 작업 스케줄링
     */
    scheduleJob(name, schedule, task) {
        if (this.jobs.has(name)) {
            this.jobs.get(name).stop();
        }

        const job = cron.schedule(schedule, async () => {
            try {
                logger.info(`Job ${name} 시작`);
                await task();
                logger.info(`Job ${name} 완료`);
            } catch (error) {
                logger.error(`Job ${name} 실행 오류:`, error);
            }
        });

        this.jobs.set(name, job);
        logger.info(`Job ${name} 스케줄 등록: ${schedule}`);
    }

    /**
     * 정기 청구 처리
     */
    async processRecurringCharges() {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.toISOString().slice(0, 7); // YYYY-MM

        try {
            // 모든 학원 조회
            const [academies] = await db.execute('SELECT id FROM academies WHERE is_active = TRUE');

            for (const academy of academies) {
                await this.processAcademyCharges(academy.id, currentDay, currentMonth);
            }
        } catch (error) {
            logger.error('정기 청구 처리 오류:', error);
        }
    }

    /**
     * 학원별 청구 처리
     */
    async processAcademyCharges(academyId, currentDay, currentMonth) {
        try {
            // 오늘 청구해야 할 정기 항목 조회
            const recurringItems = await BillingItemModel.findRecurring(academyId, currentDay);

            if (recurringItems.length === 0) {
                return;
            }

            // 이번 달 이미 청구된 학생 확인
            const [chargedStudents] = await db.execute(`
                SELECT DISTINCT student_id, billing_item_id
                FROM student_charges
                WHERE academy_id = ?
                AND DATE_FORMAT(charge_date, '%Y-%m') = ?
                AND billing_item_id IN (?)
                AND status != 'cancelled'
            `, [academyId, currentMonth, recurringItems.map(i => i.id)]);

            const chargedMap = new Map();
            chargedStudents.forEach(cs => {
                const key = `${cs.student_id}-${cs.billing_item_id}`;
                chargedMap.set(key, true);
            });

            // 활성 학생 조회
            const students = await StudentModel.findAll(academyId, { status: 'active' });

            // 청구 생성
            const charges = [];
            for (const item of recurringItems) {
                for (const student of students) {
                    const key = `${student.id}-${item.id}`;

                    // 이미 청구된 경우 스킵
                    if (chargedMap.has(key)) {
                        continue;
                    }

                    charges.push({
                        student_id: student.id,
                        billing_item_id: item.id,
                        charge_date: today.toISOString().split('T')[0],
                        amount: item.default_amount,
                        discount_amount: 0,
                        due_date: this.calculateDueDate(today)
                    });
                }
            }

            if (charges.length > 0) {
                // 일괄 청구 생성
                for (const charge of charges) {
                    await StudentChargeModel.create(academyId, charge);
                }

                logger.info(`학원 ${academyId}: ${charges.length}건의 정기 청구 생성`);

                // 청구 생성 알림
                await NotificationService.sendChargeCreatedNotification(academyId, charges);
            }
        } catch (error) {
            logger.error(`학원 ${academyId} 청구 처리 오류:`, error);
        }
    }

    /**
     * 납부 기한 계산
     */
    calculateDueDate(chargeDate, daysToAdd = 7) {
        const dueDate = new Date(chargeDate);
        dueDate.setDate(dueDate.getDate() + daysToAdd);
        return dueDate.toISOString().split('T')[0];
    }

    /**
     * 미납 알림 발송
     */
    async sendUnpaidReminders() {
        try {
            const [academies] = await db.execute('SELECT id FROM academies WHERE is_active = TRUE');

            for (const academy of academies) {
                await this.sendAcademyReminders(academy.id);
            }
        } catch (error) {
            logger.error('미납 알림 발송 오류:', error);
        }
    }

    /**
     * 학원별 미납 알림 발송
     */
    async sendAcademyReminders(academyId) {
        try {
            // 미납자 조회
            const unpaidCharges = await StudentChargeModel.findUnpaid(academyId, {
                overdue_only: true
            });

            if (unpaidCharges.length === 0) {
                return;
            }

            // 학생별로 그룹화
            const studentCharges = new Map();
            unpaidCharges.forEach(charge => {
                if (!studentCharges.has(charge.student_id)) {
                    studentCharges.set(charge.student_id, {
                        student_name: charge.student_name,
                        student_phone: charge.student_phone,
                        parent_phone: charge.parent_phone,
                        charges: []
                    });
                }
                studentCharges.get(charge.student_id).charges.push(charge);
            });

            // 알림 발송
            let sentCount = 0;
            for (const [studentId, data] of studentCharges) {
                const success = await NotificationService.sendUnpaidReminder(
                    academyId,
                    studentId,
                    data
                );
                if (success) sentCount++;
            }

            logger.info(`학원 ${academyId}: ${sentCount}명에게 미납 알림 발송`);
        } catch (error) {
            logger.error(`학원 ${academyId} 미납 알림 발송 오류:`, error);
        }
    }

    /**
     * 월별 리포트 생성
     */
    async generateMonthlyReport() {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        const month = lastMonth.toISOString().slice(0, 7);

        try {
            const [academies] = await db.execute('SELECT id, name FROM academies WHERE is_active = TRUE');

            for (const academy of academies) {
                await this.generateAcademyReport(academy.id, academy.name, month);
            }
        } catch (error) {
            logger.error('월별 리포트 생성 오류:', error);
        }
    }

    /**
     * 학원별 월별 리포트 생성
     */
    async generateAcademyReport(academyId, academyName, month) {
        try {
            // 청구 통계
            const chargeStats = await StudentChargeModel.getMonthlyStatistics(academyId, month);

            // 수납 통계
            const [paymentStats] = await db.execute(`
                SELECT
                    COUNT(DISTINCT student_id) as paid_students,
                    COUNT(*) as payment_count,
                    SUM(amount) as total_amount,
                    SUM(CASE WHEN payment_method = 'cash' THEN amount ELSE 0 END) as cash_amount,
                    SUM(CASE WHEN payment_method = 'card' THEN amount ELSE 0 END) as card_amount,
                    SUM(CASE WHEN payment_method = 'transfer' THEN amount ELSE 0 END) as transfer_amount
                FROM payment_records
                WHERE academy_id = ?
                AND DATE_FORMAT(payment_date, '%Y-%m') = ?
                AND status = 'completed'
            `, [academyId, month]);

            const report = {
                academy_id: academyId,
                academy_name: academyName,
                month: month,
                charge_stats: chargeStats,
                payment_stats: paymentStats[0],
                collection_rate: chargeStats.total_final_amount > 0
                    ? (paymentStats[0].total_amount / chargeStats.total_final_amount * 100).toFixed(1)
                    : 0,
                generated_at: new Date()
            };

            // 리포트 저장 (추후 구현)
            logger.info(`학원 ${academyName} ${month} 리포트 생성 완료`, report);

            // 리포트 이메일 발송
            await NotificationService.sendMonthlyReport(academyId, report);
        } catch (error) {
            logger.error(`학원 ${academyName} 리포트 생성 오류:`, error);
        }
    }

    /**
     * 수동 작업 실행
     */
    async runJob(jobName) {
        const job = this.jobs.get(jobName);
        if (!job) {
            throw new Error(`Job ${jobName}을 찾을 수 없습니다.`);
        }

        logger.info(`수동 실행: ${jobName}`);

        switch (jobName) {
            case 'daily-charge-check':
                await this.processRecurringCharges();
                break;
            case 'unpaid-reminder':
                await this.sendUnpaidReminders();
                break;
            case 'monthly-report':
                await this.generateMonthlyReport();
                break;
            default:
                throw new Error(`Job ${jobName} 수동 실행 미지원`);
        }
    }
}

module.exports = new SchedulerService();