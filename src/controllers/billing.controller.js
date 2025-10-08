const BillingItemModel = require('../models/billing-item.model');
const StudentChargeModel = require('../models/student-charge.model');
const PaymentRecordModel = require('../models/payment-record.model');
const StudentModel = require('../models/student.model');
const db = require('../config/database');

class BillingController {
    // ============= 청구 항목 관리 =============

    /**
     * 청구 항목 목록 조회
     */
    async getBillingItems(req, res) {
        try {
            const academyId = req.academyId;
            const { active_only } = req.query;

            const items = await BillingItemModel.findAll(
                academyId,
                active_only !== 'false'
            );

            res.json({
                success: true,
                data: items
            });
        } catch (error) {
            console.error('청구 항목 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 항목 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 청구 항목 생성
     */
    async createBillingItem(req, res) {
        try {
            const academyId = req.academyId;
            const item = await BillingItemModel.create(academyId, req.body);

            res.json({
                success: true,
                data: item
            });
        } catch (error) {
            console.error('청구 항목 생성 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 항목 생성 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 청구 항목 수정
     */
    async updateBillingItem(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;

            const updated = await BillingItemModel.update(academyId, id, req.body);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: '청구 항목을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '청구 항목이 수정되었습니다.'
            });
        } catch (error) {
            console.error('청구 항목 수정 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 항목 수정 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 청구 항목 삭제
     */
    async deleteBillingItem(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;

            const deleted = await BillingItemModel.delete(academyId, id);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: '청구 항목을 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '청구 항목이 삭제되었습니다.'
            });
        } catch (error) {
            console.error('청구 항목 삭제 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 항목 삭제 중 오류가 발생했습니다.'
            });
        }
    }

    // ============= 학생 청구 관리 =============

    /**
     * 청구 생성
     */
    async createCharge(req, res) {
        try {
            const academyId = req.academyId;
            const charge = await StudentChargeModel.create(academyId, req.body);

            res.json({
                success: true,
                data: charge
            });
        } catch (error) {
            console.error('청구 생성 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 생성 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 일괄 청구 생성
     */
    async bulkCreateCharges(req, res) {
        try {
            const academyId = req.academyId;
            const { student_ids, ...chargeData } = req.body;

            if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: '학생을 선택해주세요.'
                });
            }

            const charges = await StudentChargeModel.bulkCreate(
                academyId,
                student_ids,
                chargeData
            );

            res.json({
                success: true,
                data: charges,
                message: `${charges.length}명의 학생에게 청구가 생성되었습니다.`
            });
        } catch (error) {
            console.error('일괄 청구 생성 오류:', error);
            res.status(500).json({
                success: false,
                error: '일괄 청구 생성 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 청구 조회
     */
    async getCharge(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;

            const charge = await StudentChargeModel.findById(academyId, id);

            if (!charge) {
                return res.status(404).json({
                    success: false,
                    error: '청구 정보를 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                data: charge
            });
        } catch (error) {
            console.error('청구 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 학생별 청구 내역
     */
    async getStudentCharges(req, res) {
        try {
            const academyId = req.academyId;
            const { student_id } = req.params;
            const filters = req.query;

            const charges = await StudentChargeModel.findByStudent(
                academyId,
                student_id,
                filters
            );

            res.json({
                success: true,
                data: charges
            });
        } catch (error) {
            console.error('학생 청구 내역 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 내역 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 미납 청구 조회
     */
    async getUnpaidCharges(req, res) {
        try {
            const academyId = req.academyId;
            const filters = req.query;

            const charges = await StudentChargeModel.findUnpaid(academyId, filters);

            res.json({
                success: true,
                data: charges
            });
        } catch (error) {
            console.error('미납 청구 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '미납 청구 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 월별 청구 조회
     */
    async getMonthlyCharges(req, res) {
        try {
            const academyId = req.academyId;
            const { month } = req.params; // YYYY-MM

            const charges = await StudentChargeModel.findByMonth(academyId, month);

            res.json({
                success: true,
                data: charges
            });
        } catch (error) {
            console.error('월별 청구 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '월별 청구 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 청구 수정
     */
    async updateCharge(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;

            const updated = await StudentChargeModel.update(academyId, id, req.body);

            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: '청구 정보를 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '청구 정보가 수정되었습니다.'
            });
        } catch (error) {
            console.error('청구 수정 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 수정 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 청구 취소
     */
    async cancelCharge(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;
            const { reason } = req.body;

            const cancelled = await StudentChargeModel.cancel(academyId, id, reason);

            if (!cancelled) {
                return res.status(404).json({
                    success: false,
                    error: '청구 정보를 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                message: '청구가 취소되었습니다.'
            });
        } catch (error) {
            console.error('청구 취소 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 취소 중 오류가 발생했습니다.'
            });
        }
    }

    // ============= 수납 관리 =============

    /**
     * 수납 등록
     */
    async createPayment(req, res) {
        try {
            const academyId = req.academyId;
            const data = {
                ...req.body,
                processed_by: req.user.id
            };

            // 영수증 번호 자동 생성
            if (!data.receipt_number) {
                data.receipt_number = await PaymentRecordModel.generateReceiptNumber(academyId);
            }

            const payment = await PaymentRecordModel.create(academyId, data);

            res.json({
                success: true,
                data: payment
            });
        } catch (error) {
            console.error('수납 등록 오류:', error);
            res.status(500).json({
                success: false,
                error: '수납 등록 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 수납 조회
     */
    async getPayment(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;

            const payment = await PaymentRecordModel.findById(academyId, id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    error: '수납 정보를 찾을 수 없습니다.'
                });
            }

            res.json({
                success: true,
                data: payment
            });
        } catch (error) {
            console.error('수납 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '수납 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 학생별 수납 내역
     */
    async getStudentPayments(req, res) {
        try {
            const academyId = req.academyId;
            const { student_id } = req.params;
            const filters = req.query;

            const payments = await PaymentRecordModel.findByStudent(
                academyId,
                student_id,
                filters
            );

            res.json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('학생 수납 내역 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '수납 내역 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 일별 수납 조회
     */
    async getDailyPayments(req, res) {
        try {
            const academyId = req.academyId;
            const { date } = req.params; // YYYY-MM-DD

            const payments = await PaymentRecordModel.findByDate(academyId, date);

            res.json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('일별 수납 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '일별 수납 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 기간별 수납 조회
     */
    async getPeriodPayments(req, res) {
        try {
            const academyId = req.academyId;
            const { from_date, to_date } = req.query;

            if (!from_date || !to_date) {
                return res.status(400).json({
                    success: false,
                    error: '조회 기간을 입력해주세요.'
                });
            }

            const payments = await PaymentRecordModel.findByPeriod(
                academyId,
                from_date,
                to_date
            );

            res.json({
                success: true,
                data: payments
            });
        } catch (error) {
            console.error('기간별 수납 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '기간별 수납 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 수납 취소
     */
    async cancelPayment(req, res) {
        try {
            const academyId = req.academyId;
            const { id } = req.params;
            const cancelData = {
                cancelled_by: req.user.id,
                cancelled_reason: req.body.reason
            };

            const cancelled = await PaymentRecordModel.cancel(academyId, id, cancelData);

            if (!cancelled) {
                return res.status(404).json({
                    success: false,
                    error: '수납 정보를 찾을 수 없거나 이미 취소된 수납입니다.'
                });
            }

            res.json({
                success: true,
                message: '수납이 취소되었습니다.'
            });
        } catch (error) {
            console.error('수납 취소 오류:', error);
            res.status(500).json({
                success: false,
                error: '수납 취소 중 오류가 발생했습니다.'
            });
        }
    }

    // ============= 통계 =============

    /**
     * 청구 통계
     */
    async getChargeStatistics(req, res) {
        try {
            const academyId = req.academyId;
            const { month } = req.query; // YYYY-MM

            const currentMonth = month || new Date().toISOString().slice(0, 7);
            const stats = await StudentChargeModel.getMonthlyStatistics(
                academyId,
                currentMonth
            );

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('청구 통계 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '청구 통계 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 수납 통계
     */
    async getPaymentStatistics(req, res) {
        try {
            const academyId = req.academyId;
            const { type, date, month, from_date, to_date } = req.query;

            let stats;

            if (type === 'daily' && date) {
                stats = await PaymentRecordModel.getDailyStatistics(academyId, date);
            } else if (type === 'monthly' || month) {
                const targetMonth = month || new Date().toISOString().slice(0, 7);
                stats = await PaymentRecordModel.getMonthlyStatistics(academyId, targetMonth);
            } else if (type === 'period' && from_date && to_date) {
                stats = await PaymentRecordModel.getPeriodStatistics(
                    academyId,
                    from_date,
                    to_date
                );
            } else {
                // 기본값: 이번 달 통계
                const currentMonth = new Date().toISOString().slice(0, 7);
                stats = await PaymentRecordModel.getMonthlyStatistics(academyId, currentMonth);
            }

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('수납 통계 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '수납 통계 조회 중 오류가 발생했습니다.'
            });
        }
    }

    /**
     * 미납자 목록
     */
    async getUnpaidStudents(req, res) {
        try {
            const academyId = req.academyId;

            const query = `
                SELECT
                    s.id as student_id,
                    s.name as student_name,
                    s.phone as student_phone,
                    s.parent_phone,
                    s.grade,
                    s.school,
                    COUNT(sc.id) as unpaid_count,
                    SUM(sc.remaining_amount) as total_unpaid,
                    MIN(sc.due_date) as earliest_due_date,
                    GROUP_CONCAT(
                        CONCAT(
                            DATE_FORMAT(sc.charge_date, '%m/%d'),
                            ':',
                            sc.final_amount
                        )
                        ORDER BY sc.charge_date
                        SEPARATOR ', '
                    ) as charge_details
                FROM student_charges sc
                INNER JOIN students s ON sc.student_id = s.id
                WHERE sc.academy_id = ?
                AND sc.status IN ('pending', 'partial', 'overdue')
                AND sc.remaining_amount > 0
                AND s.status = 'active'
                GROUP BY s.id, s.name, s.phone, s.parent_phone, s.grade, s.school
                ORDER BY total_unpaid DESC, s.name
            `;

            const [rows] = await db.execute(query, [academyId]);

            res.json({
                success: true,
                data: rows
            });
        } catch (error) {
            console.error('미납자 목록 조회 오류:', error);
            res.status(500).json({
                success: false,
                error: '미납자 목록 조회 중 오류가 발생했습니다.'
            });
        }
    }
}

module.exports = new BillingController();