const BillingModel = require('../models/billing.model');
const PaymentModel = require('../models/payment.model');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * 수납 관리 컨트롤러
 * 수강료 청구 및 수납 처리
 */
class PaymentsController {
  /**
   * 청구 목록 조회
   * @route GET /api/billings
   */
  static async getBillings(req, res) {
    try {
      const academyId = req.academyId;
      const { month, student_name, status, page = 1, limit = 20 } = req.query;

      const filters = {};
      if (month) filters.billing_month = month;
      if (student_name) filters.student_name = student_name;
      if (status) filters.status = status;

      filters.limit = parseInt(limit);
      filters.offset = (parseInt(page) - 1) * parseInt(limit);

      const [billings, total] = await Promise.all([
        BillingModel.findAll(academyId, filters),
        BillingModel.count(academyId, { billing_month: filters.billing_month, student_name: filters.student_name, status: filters.status })
      ]);

      return successResponse(res, {
        billings,
        total,
        page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit))
      });

    } catch (error) {
      console.error('청구 목록 조회 오류:', error);
      return errorResponse(res, '청구 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 청구 상세 조회
   * @route GET /api/billings/:id
   */
  static async getBillingDetail(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const billing = await BillingModel.findById(academyId, id);

      if (!billing) {
        return errorResponse(res, '청구 내역을 찾을 수 없습니다.', 404);
      }

      // 수납 내역도 함께 조회
      const payments = await PaymentModel.findByBilling(academyId, id);

      return successResponse(res, {
        billing,
        payments
      });

    } catch (error) {
      console.error('청구 상세 조회 오류:', error);
      return errorResponse(res, '청구 상세를 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수납 처리
   * @route POST /api/payments
   */
  static async createPayment(req, res) {
    try {
      const academyId = req.academyId;
      const userId = req.user?.id;
      const { billing_id, amount, payment_method, note } = req.body;

      // 유효성 검증
      if (!billing_id || !amount) {
        return errorResponse(res, '청구 ID와 수납 금액은 필수입니다.', 400);
      }

      if (amount <= 0) {
        return errorResponse(res, '수납 금액은 0보다 커야 합니다.', 400);
      }

      // 1. payments 테이블에 수납 내역 추가
      const paymentId = await PaymentModel.create(academyId, {
        billing_id,
        amount,
        payment_method,
        note,
        created_by: userId
      });

      // 2. billings 테이블 업데이트
      const updatedBilling = await BillingModel.updatePayment(academyId, billing_id, amount);

      return successResponse(res, {
        payment_id: paymentId,
        remaining_amount: updatedBilling.remaining_amount,
        status: updatedBilling.status,
        message: `${Number(amount).toLocaleString()}원이 수납되었습니다.` +
                 (updatedBilling.remaining_amount > 0
                   ? ` 잔액: ${Number(updatedBilling.remaining_amount).toLocaleString()}원`
                   : ' 완납되었습니다.')
      }, 201);

    } catch (error) {
      console.error('수납 처리 오류:', error);
      return errorResponse(res, error.message || '수납 처리 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 청구 삭제
   * @route DELETE /api/billings/:id
   */
  static async deleteBilling(req, res) {
    try {
      const academyId = req.academyId;
      const { id } = req.params;

      const deleted = await BillingModel.delete(academyId, id);

      if (!deleted) {
        return errorResponse(res, '청구 내역을 찾을 수 없습니다.', 404);
      }

      return successResponse(res, {
        message: '청구 내역이 삭제되었습니다.'
      });

    } catch (error) {
      console.error('청구 삭제 오류:', error);
      return errorResponse(res, '청구 삭제 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 월별 청구 자동 생성
   * @route POST /api/billings/generate
   */
  static async generateBillings(req, res) {
    try {
      const academyId = req.academyId;
      const { month } = req.body;

      if (!month) {
        return errorResponse(res, '청구 월을 입력해주세요.', 400);
      }

      // YYYY-MM 형식을 YYYY-MM-01로 변환
      const billingMonth = `${month}-01`;

      const count = await BillingModel.generateMonthlyBillings(academyId, billingMonth);

      return successResponse(res, {
        message: `${count}건의 청구가 생성되었습니다.`,
        count
      }, 201);

    } catch (error) {
      console.error('청구 생성 오류:', error);
      return errorResponse(res, error.message || '청구 생성 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * LIVE 상태 수강생 목록 조회 (원비 생성용)
   * @route GET /api/enrollments/active
   */
  static async getActiveEnrollments(req, res) {
    try {
      const academyId = req.academyId;
      const { search, class_id, sort_by = 'student_name', page = 1, limit = 50 } = req.query;

      const EnrollmentModel = require('../models/enrollment.model');

      const filters = {
        status: 'active',
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      };

      if (search) filters.search = search;
      if (class_id) filters.class_id = class_id;
      if (sort_by) filters.sort_by = sort_by;

      // active enrollment 조회 (학생명, 수업명 포함)
      let query = `
        SELECT
          e.id as enrollment_id,
          e.student_id,
          e.class_id,
          e.start_date,
          e.status,
          s.name as student_name,
          c.class_name,
          c.tuition
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        WHERE s.academy_id = ? AND e.status = 'active'
      `;
      const params = [academyId];

      if (search) {
        query += ' AND s.name LIKE ?';
        params.push(`%${search}%`);
      }

      if (class_id) {
        query += ' AND e.class_id = ?';
        params.push(class_id);
      }

      // 정렬
      switch (sort_by) {
        case 'class_name':
          query += ' ORDER BY c.class_name ASC, s.name ASC';
          break;
        case 'start_date':
          query += ' ORDER BY e.start_date DESC';
          break;
        case 'student_name':
        default:
          query += ' ORDER BY s.name ASC';
          break;
      }

      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt((page - 1) * limit));

      const db = require('../config/database');
      const [enrollments] = await db.execute(query, params);

      // 전체 개수 조회
      let countQuery = `
        SELECT COUNT(*) as total
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        WHERE s.academy_id = ? AND e.status = 'active'
      `;
      const countParams = [academyId];

      if (search) {
        countQuery += ' AND s.name LIKE ?';
        countParams.push(`%${search}%`);
      }

      if (class_id) {
        countQuery += ' AND e.class_id = ?';
        countParams.push(class_id);
      }

      const [countResult] = await db.execute(countQuery, countParams);
      const total = countResult[0].total;

      return successResponse(res, {
        enrollments,
        total,
        page: parseInt(page),
        total_pages: Math.ceil(total / parseInt(limit))
      });

    } catch (error) {
      console.error('LIVE 수강생 조회 오류:', error);
      return errorResponse(res, 'LIVE 수강생 목록을 불러오는 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 수납 취소 (가장 최근 수납 내역 취소)
   * @route POST /api/payments/:id/cancel
   */
  static async cancelPayment(req, res) {
    try {
      const academyId = req.academyId;
      const { id: billingId } = req.params;

      const PaymentModel = require('../models/payment.model');
      const db = require('../config/database');
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        // 해당 billing의 가장 최근 payment 조회
        const [payments] = await connection.execute(
          `SELECT p.*, b.id as billing_id
           FROM payments p
           JOIN billings b ON p.billing_id = b.id
           JOIN students s ON b.student_id = s.id
           WHERE b.id = ? AND s.academy_id = ?
           ORDER BY p.payment_date DESC, p.id DESC
           LIMIT 1`,
          [billingId, academyId]
        );

        if (payments.length === 0) {
          return errorResponse(res, '취소할 수납 내역이 없습니다.', 404);
        }

        const payment = payments[0];

        // payment 삭제
        await connection.execute('DELETE FROM payments WHERE id = ?', [payment.id]);

        // billing 업데이트 (수납 금액 차감)
        const [billings] = await connection.execute(
          'SELECT * FROM billings WHERE id = ?',
          [billingId]
        );

        if (billings.length === 0) {
          throw new Error('청구 내역을 찾을 수 없습니다.');
        }

        const billing = billings[0];
        const newPaidAmount = Math.round(parseFloat(billing.paid_amount) - parseFloat(payment.amount));
        const newRemainingAmount = Math.round(parseFloat(billing.amount) - newPaidAmount);

        let newStatus = 'unpaid';
        if (newRemainingAmount === 0 || newRemainingAmount <= 0) {
          newStatus = 'paid';
        } else if (newPaidAmount > 0) {
          newStatus = 'partial';
        }

        await connection.execute(
          `UPDATE billings
           SET paid_amount = ?,
               remaining_amount = ?,
               status = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [newPaidAmount, newRemainingAmount, newStatus, billingId]
        );

        await connection.commit();

        return successResponse(res, {
          message: `${Number(payment.amount).toLocaleString()}원 수납이 취소되었습니다.`
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('수납 취소 오류:', error);
      return errorResponse(res, error.message || '수납 취소 중 오류가 발생했습니다.', 500);
    }
  }

  /**
   * 선택된 수강생들의 원비 일괄 생성
   * @route POST /api/billings/bulk-generate
   */
  static async bulkGenerateBillings(req, res) {
    try {
      const academyId = req.academyId;
      const { enrollment_ids, month } = req.body;

      if (!enrollment_ids || !Array.isArray(enrollment_ids) || enrollment_ids.length === 0) {
        return errorResponse(res, '수강생을 선택해주세요.', 400);
      }

      if (!month) {
        return errorResponse(res, '청구 월을 선택해주세요.', 400);
      }

      // YYYY-MM 형식을 YYYY-MM-01로 변환
      const billingMonth = `${month}-01`;

      const db = require('../config/database');
      const connection = await db.getConnection();

      try {
        await connection.beginTransaction();

        let created = 0;
        let skipped = 0;
        const errors = [];

        for (const enrollmentId of enrollment_ids) {
          // enrollment 정보 조회 (학생, 수업 정보 포함)
          const [enrollments] = await connection.execute(
            `SELECT e.*, s.id as student_id, s.academy_id, c.tuition
             FROM enrollments e
             JOIN students s ON e.student_id = s.id
             JOIN classes c ON e.class_id = c.id
             WHERE e.id = ? AND s.academy_id = ? AND e.status = 'active'`,
            [enrollmentId, academyId]
          );

          if (enrollments.length === 0) {
            skipped++;
            continue;
          }

          const enrollment = enrollments[0];

          // 중복 확인
          const [existing] = await connection.execute(
            'SELECT id FROM billings WHERE enrollment_id = ? AND billing_month = ?',
            [enrollmentId, billingMonth]
          );

          if (existing.length > 0) {
            skipped++;
            continue;
          }

          // 청구 생성
          await connection.execute(
            `INSERT INTO billings
             (student_id, enrollment_id, billing_month, amount, paid_amount, remaining_amount, status)
             VALUES (?, ?, ?, ?, 0, ?, 'unpaid')`,
            [enrollment.student_id, enrollmentId, billingMonth, enrollment.tuition, enrollment.tuition]
          );

          created++;
        }

        await connection.commit();

        let message = `${created}건의 원비가 생성되었습니다.`;
        if (skipped > 0) {
          message += ` (${skipped}건 중복 스킵)`;
        }

        return successResponse(res, {
          message,
          created,
          skipped
        }, 201);

      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }

    } catch (error) {
      console.error('일괄 청구 생성 오류:', error);
      return errorResponse(res, error.message || '원비 생성 중 오류가 발생했습니다.', 500);
    }
  }
}

module.exports = PaymentsController;
