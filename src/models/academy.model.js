const db = require('../config/database');

/**
 * 학원 데이터 모델
 * 멀티테넌트 학원 관리 및 사용자-학원 관계 관리
 */
class AcademyModel {
  /**
   * 사용자의 학원 목록 조회
   * @param {number} userId - 사용자 ID
   * @returns {Promise<Array>} 사용자가 속한 학원 목록 (역할 포함)
   */
  static async findByUserId(userId) {
    const query = `
      SELECT a.*, uar.role
      FROM academies a
      INNER JOIN user_academy_roles uar ON a.id = uar.academy_id
      WHERE uar.user_id = ?
      ORDER BY a.created_at DESC
    `;

    const [rows] = await db.execute(query, [userId]);
    return rows;
  }

  /**
   * 학원 ID로 조회
   * @param {number} academyId - 학원 ID
   * @returns {Promise<Object|undefined>} 학원 정보 또는 undefined
   */
  static async findById(academyId) {
    const query = 'SELECT * FROM academies WHERE id = ?';
    const [rows] = await db.execute(query, [academyId]);
    return rows[0];
  }

  /**
   * 학원 등록
   * @param {Object} academyData - 학원 정보
   * @param {string} academyData.name - 학원 이름
   * @param {string} academyData.registration_number - 학원등록번호
   * @param {string} academyData.business_number - 사업자등록번호
   * @param {string} academyData.registration_cert_path - 학원운영등록증 파일 경로
   * @param {string} academyData.business_cert_path - 사업자등록증 파일 경로
   * @param {string} [academyData.address] - 주소
   * @param {string} [academyData.phone] - 전화번호
   * @returns {Promise<number>} 생성된 학원 ID
   */
  static async create(academyData) {
    const query = `
      INSERT INTO academies
      (name, registration_number, business_number,
       registration_cert_path, business_cert_path,
       verification_status, address, phone)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
    `;

    const [result] = await db.execute(query, [
      academyData.name,
      academyData.registration_number,
      academyData.business_number,
      academyData.registration_cert_path,
      academyData.business_cert_path,
      academyData.address || null,
      academyData.phone || null
    ]);

    return result.insertId;
  }

  /**
   * 학원-사용자 관계 생성
   * @param {number} userId - 사용자 ID
   * @param {number} academyId - 학원 ID
   * @param {string} [role='owner'] - 역할 (owner, admin, teacher, staff)
   * @returns {Promise<void>}
   */
  static async assignUserRole(userId, academyId, role = 'owner') {
    const query = `
      INSERT INTO user_academy_roles (user_id, academy_id, role)
      VALUES (?, ?, ?)
    `;

    await db.execute(query, [userId, academyId, role]);
  }

  /**
   * 사용자가 학원에 접근 권한이 있는지 확인
   * @param {number} userId - 사용자 ID
   * @param {number} academyId - 학원 ID
   * @returns {Promise<boolean>} 접근 권한 여부
   */
  static async hasAccess(userId, academyId) {
    const query = `
      SELECT COUNT(*) as count
      FROM user_academy_roles
      WHERE user_id = ? AND academy_id = ?
    `;

    const [[{ count }]] = await db.execute(query, [userId, academyId]);
    return count > 0;
  }

  /**
   * OCR 검증 상태 업데이트
   * @param {number} academyId - 학원 ID
   * @param {string} status - 검증 상태 (pending, verified, failed)
   * @param {string} [message=null] - 검증 메시지
   * @returns {Promise<void>}
   */
  static async updateVerification(academyId, status, message = null) {
    const query = `
      UPDATE academies
      SET verification_status = ?,
          verification_message = ?
      WHERE id = ?
    `;

    await db.execute(query, [status, message, academyId]);
  }

  // 학원 정보 수정
  static async update(academyId, academyData) {
    const query = `
      UPDATE academies
      SET name = ?,
          registration_number = ?,
          business_number = ?,
          address = ?,
          phone = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [
      academyData.name,
      academyData.registration_number,
      academyData.business_number,
      academyData.address,
      academyData.phone,
      academyId
    ]);

    return result.affectedRows;
  }
}

module.exports = AcademyModel;
