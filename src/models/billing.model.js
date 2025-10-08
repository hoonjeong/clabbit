const db = require('../config/database');

/**
 * 수강료 청구 모델
 * 학생의 월별 수강료 청구 정보 관리
 */
class BillingModel {
  /**
   * 청구 목록 조회 (필터링 및 페이지네이션 지원)
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 청구 목록
   */
  static async findAll(academyId, filters = {}) {
    let query = `
      SELECT
        b.*,
        s.name as student_name,
        s.student_phone,
        s.parent_phone,
        c.class_name,
        e.start_date as enrollment_start_date
      FROM billings b
      JOIN students s ON b.student_id = s.id
      JOIN enrollments e ON b.enrollment_id = e.id
      JOIN classes c ON e.class_id = c.id
      WHERE s.academy_id = ?
    `;
    const params = [academyId];

    // 학생 이름 검색
    if (filters.student_name) {
      query += ' AND s.name LIKE ?';
      params.push(`%${filters.student_name}%`);
    }

    // 청구 월 필터
    if (filters.billing_month) {
      query += ' AND DATE_FORMAT(b.billing_month, "%Y-%m") = ?';
      params.push(filters.billing_month);
    }

    // 상태 필터
    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    // 정렬
    query += ' ORDER BY b.billing_month DESC, s.name ASC';

    // 페이지네이션
    if (filters.limit) {
      const offset = filters.offset || 0;
      query += ' LIMIT ? OFFSET ?';
      params.push(parseInt(filters.limit), parseInt(offset));
    }

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 청구 개수 조회
   * @param {number} academyId - 학원 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<number>} 청구 개수
   */
  static async count(academyId, filters = {}) {
    let query = `
      SELECT COUNT(*) as count
      FROM billings b
      JOIN students s ON b.student_id = s.id
      WHERE s.academy_id = ?
    `;
    const params = [academyId];

    if (filters.student_name) {
      query += ' AND s.name LIKE ?';
      params.push(`%${filters.student_name}%`);
    }

    if (filters.billing_month) {
      query += ' AND DATE_FORMAT(b.billing_month, "%Y-%m") = ?';
      params.push(filters.billing_month);
    }

    if (filters.status) {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    const [rows] = await db.execute(query, params);
    return rows[0].count;
  }

  /**
   * 청구 상세 조회
   * @param {number} academyId - 학원 ID
   * @param {number} billingId - 청구 ID
   * @returns {Promise<Object|null>} 청구 정보
   */
  static async findById(academyId, billingId) {
    const query = `
      SELECT
        b.*,
        s.name as student_name,
        s.student_phone,
        s.parent_phone,
        c.class_name,
        e.start_date as enrollment_start_date
      FROM billings b
      JOIN students s ON b.student_id = s.id
      JOIN enrollments e ON b.enrollment_id = e.id
      JOIN classes c ON e.class_id = c.id
      WHERE b.id = ? AND s.academy_id = ?
    `;

    const [rows] = await db.execute(query, [billingId, academyId]);
    return rows[0] || null;
  }

  /**
   * 청구 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} billingData - 청구 데이터
   * @returns {Promise<number>} 생성된 청구 ID
   */
  static async create(academyId, billingData) {
    // 학생이 해당 학원에 속하는지 확인
    const checkQuery = `
      SELECT s.id
      FROM students s
      JOIN enrollments e ON s.id = e.student_id
      WHERE s.id = ? AND s.academy_id = ? AND e.id = ?
    `;
    const [checkRows] = await db.execute(checkQuery, [
      billingData.student_id,
      academyId,
      billingData.enrollment_id
    ]);

    if (checkRows.length === 0) {
      throw new Error('학생 또는 수강 정보를 찾을 수 없습니다.');
    }

    // 중복 청구 확인 (같은 enrollment + 같은 월)
    const duplicateQuery = `
      SELECT id FROM billings
      WHERE enrollment_id = ? AND billing_month = ?
    `;
    const [duplicateRows] = await db.execute(duplicateQuery, [
      billingData.enrollment_id,
      billingData.billing_month
    ]);

    if (duplicateRows.length > 0) {
      throw new Error('해당 월에 이미 청구 내역이 존재합니다.');
    }

    const remaining = billingData.amount - (billingData.paid_amount || 0);

    const insertQuery = `
      INSERT INTO billings
      (student_id, enrollment_id, billing_month, amount, paid_amount, remaining_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const status = remaining === 0 ? 'paid' : (billingData.paid_amount > 0 ? 'partial' : 'unpaid');

    const [result] = await db.execute(insertQuery, [
      billingData.student_id,
      billingData.enrollment_id,
      billingData.billing_month,
      billingData.amount,
      billingData.paid_amount || 0,
      remaining,
      status
    ]);

    return result.insertId;
  }

  /**
   * 청구 업데이트 (수납 처리 시)
   * @param {number} academyId - 학원 ID
   * @param {number} billingId - 청구 ID
   * @param {number} paymentAmount - 수납 금액
   * @returns {Promise<Object>} 업데이트 결과
   */
  static async updatePayment(academyId, billingId, paymentAmount) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 현재 청구 정보 조회
      const [billings] = await connection.execute(
        `SELECT b.*, s.academy_id
         FROM billings b
         JOIN students s ON b.student_id = s.id
         WHERE b.id = ? AND s.academy_id = ?`,
        [billingId, academyId]
      );

      if (billings.length === 0) {
        throw new Error('청구 내역을 찾을 수 없습니다.');
      }

      const billing = billings[0];
      const newPaidAmount = Math.round(parseFloat(billing.paid_amount) + parseFloat(paymentAmount));
      const newRemainingAmount = Math.round(parseFloat(billing.amount) - newPaidAmount);

      if (newRemainingAmount < 0) {
        throw new Error('수납 금액이 청구 금액보다 클 수 없습니다.');
      }

      // 상태 결정
      let newStatus = 'unpaid';
      if (newRemainingAmount === 0 || newRemainingAmount <= 0) {
        newStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newStatus = 'partial';
      }

      // billings 테이블 업데이트
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

      return {
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status: newStatus
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 청구 삭제
   * @param {number} academyId - 학원 ID
   * @param {number} billingId - 청구 ID
   * @returns {Promise<boolean>} 성공 여부
   */
  static async delete(academyId, billingId) {
    const query = `
      DELETE b FROM billings b
      JOIN students s ON b.student_id = s.id
      WHERE b.id = ? AND s.academy_id = ?
    `;

    const [result] = await db.execute(query, [billingId, academyId]);
    return result.affectedRows > 0;
  }

  /**
   * 월별 청구 자동 생성
   * @param {number} academyId - 학원 ID
   * @param {string} billingMonth - 청구 월 (YYYY-MM-01 형식)
   * @returns {Promise<number>} 생성된 청구 개수
   */
  static async generateMonthlyBillings(academyId, billingMonth) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 활성 상태의 enrollment 조회
      const [enrollments] = await connection.execute(
        `SELECT
          e.id as enrollment_id,
          e.student_id,
          e.class_id,
          c.tuition
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        WHERE s.academy_id = ?
          AND e.status = 'active'
          AND e.id NOT IN (
            SELECT enrollment_id
            FROM billings
            WHERE billing_month = ?
          )`,
        [academyId, billingMonth]
      );

      let count = 0;

      for (const enrollment of enrollments) {
        await connection.execute(
          `INSERT INTO billings
           (student_id, enrollment_id, billing_month, amount, paid_amount, remaining_amount, status)
           VALUES (?, ?, ?, ?, 0, ?, 'unpaid')`,
          [
            enrollment.student_id,
            enrollment.enrollment_id,
            billingMonth,
            enrollment.tuition,
            enrollment.tuition
          ]
        );
        count++;
      }

      await connection.commit();
      return count;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = BillingModel;
