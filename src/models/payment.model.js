const db = require('../config/database');

/**
 * 수납 내역 모델
 * 실제 수납 기록 관리
 */
class PaymentModel {
  /**
   * 수납 생성
   * @param {number} academyId - 학원 ID
   * @param {Object} paymentData - 수납 데이터
   * @returns {Promise<number>} 생성된 수납 ID
   */
  static async create(academyId, paymentData) {
    // billing이 해당 학원에 속하는지 확인
    const checkQuery = `
      SELECT b.id, b.student_id
      FROM billings b
      JOIN students s ON b.student_id = s.id
      WHERE b.id = ? AND s.academy_id = ?
    `;
    const [checkRows] = await db.execute(checkQuery, [
      paymentData.billing_id,
      academyId
    ]);

    if (checkRows.length === 0) {
      throw new Error('청구 내역을 찾을 수 없습니다.');
    }

    const insertQuery = `
      INSERT INTO payments
      (billing_id, student_id, amount, payment_date, payment_method, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await db.execute(insertQuery, [
      paymentData.billing_id,
      checkRows[0].student_id,
      paymentData.amount,
      paymentData.payment_date || new Date(),
      paymentData.payment_method || null,
      paymentData.note || null,
      paymentData.created_by || null
    ]);

    return result.insertId;
  }

  /**
   * 특정 청구의 수납 내역 조회
   * @param {number} academyId - 학원 ID
   * @param {number} billingId - 청구 ID
   * @returns {Promise<Array>} 수납 내역 목록
   */
  static async findByBilling(academyId, billingId) {
    const query = `
      SELECT p.*
      FROM payments p
      JOIN billings b ON p.billing_id = b.id
      JOIN students s ON b.student_id = s.id
      WHERE p.billing_id = ? AND s.academy_id = ?
      ORDER BY p.payment_date DESC
    `;

    const [rows] = await db.execute(query, [billingId, academyId]);
    return rows;
  }

  /**
   * 특정 학생의 수납 내역 조회
   * @param {number} academyId - 학원 ID
   * @param {number} studentId - 학생 ID
   * @param {Object} filters - 필터 옵션
   * @returns {Promise<Array>} 수납 내역 목록
   */
  static async findByStudent(academyId, studentId, filters = {}) {
    let query = `
      SELECT p.*, b.billing_month, b.amount as billing_amount, c.class_name
      FROM payments p
      JOIN billings b ON p.billing_id = b.id
      JOIN enrollments e ON b.enrollment_id = e.id
      JOIN classes c ON e.class_id = c.id
      JOIN students s ON b.student_id = s.id
      WHERE p.student_id = ? AND s.academy_id = ?
    `;
    const params = [studentId, academyId];

    // 날짜 범위 필터
    if (filters.start_date) {
      query += ' AND p.payment_date >= ?';
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ' AND p.payment_date <= ?';
      params.push(filters.end_date);
    }

    query += ' ORDER BY p.payment_date DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  }

  /**
   * 수납 상세 조회
   * @param {number} academyId - 학원 ID
   * @param {number} paymentId - 수납 ID
   * @returns {Promise<Object|null>} 수납 정보
   */
  static async findById(academyId, paymentId) {
    const query = `
      SELECT p.*, s.name as student_name, b.billing_month, b.amount as billing_amount
      FROM payments p
      JOIN billings b ON p.billing_id = b.id
      JOIN students s ON b.student_id = s.id
      WHERE p.id = ? AND s.academy_id = ?
    `;

    const [rows] = await db.execute(query, [paymentId, academyId]);
    return rows[0] || null;
  }

  /**
   * 수납 삭제 (취소)
   * @param {number} academyId - 학원 ID
   * @param {number} paymentId - 수납 ID
   * @returns {Promise<Object>} 삭제된 수납 정보 (billing 업데이트용)
   */
  static async delete(academyId, paymentId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 수납 정보 조회
      const [payments] = await connection.execute(
        `SELECT p.*, b.id as billing_id
         FROM payments p
         JOIN billings b ON p.billing_id = b.id
         JOIN students s ON b.student_id = s.id
         WHERE p.id = ? AND s.academy_id = ?`,
        [paymentId, academyId]
      );

      if (payments.length === 0) {
        throw new Error('수납 내역을 찾을 수 없습니다.');
      }

      const payment = payments[0];

      // 수납 내역 삭제
      await connection.execute('DELETE FROM payments WHERE id = ?', [paymentId]);

      await connection.commit();

      return {
        billing_id: payment.billing_id,
        amount: payment.amount
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 기간별 수납 통계
   * @param {number} academyId - 학원 ID
   * @param {string} startDate - 시작일
   * @param {string} endDate - 종료일
   * @returns {Promise<Object>} 수납 통계
   */
  static async getStatistics(academyId, startDate, endDate) {
    const query = `
      SELECT
        COUNT(*) as total_count,
        SUM(p.amount) as total_amount,
        AVG(p.amount) as average_amount
      FROM payments p
      JOIN billings b ON p.billing_id = b.id
      JOIN students s ON b.student_id = s.id
      WHERE s.academy_id = ?
        AND p.payment_date >= ?
        AND p.payment_date <= ?
    `;

    const [rows] = await db.execute(query, [academyId, startDate, endDate]);
    return rows[0];
  }
}

module.exports = PaymentModel;
