const db = require('../config/database');

/**
 * 사용자 데이터 모델
 * 클래빗 시스템의 사용자 계정 관리
 */
class UserModel {
  /**
   * 이메일로 사용자 조회
   * @param {string} email - 사용자 이메일
   * @returns {Promise<Object|undefined>} 사용자 정보 또는 undefined
   */
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const [rows] = await db.execute(query, [email]);
    return rows[0];
  }

  /**
   * 사용자 ID로 조회
   * @param {number} id - 사용자 ID
   * @returns {Promise<Object|undefined>} 사용자 정보 또는 undefined
   */
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ?';
    const [rows] = await db.execute(query, [id]);
    return rows[0];
  }

  /**
   * 사용자 생성
   * @param {Object} userData - 사용자 정보
   * @param {string} userData.email - 이메일
   * @param {string} userData.password - 비밀번호 (bcrypt 해시)
   * @param {string} userData.name - 이름
   * @param {string} [userData.phone] - 전화번호
   * @returns {Promise<number>} 생성된 사용자 ID
   */
  static async create(userData) {
    const query = `
      INSERT INTO users (email, password, name, phone)
      VALUES (?, ?, ?, ?)
    `;

    const [result] = await db.execute(query, [
      userData.email,
      userData.password,
      userData.name,
      userData.phone || null
    ]);

    return result.insertId;
  }

  /**
   * 사용자 정보 수정
   * @param {number} id - 사용자 ID
   * @param {Object} userData - 수정할 사용자 정보
   * @param {string} userData.name - 이름
   * @param {string} userData.phone - 전화번호
   * @returns {Promise<number>} 수정된 행 수
   */
  static async update(id, userData) {
    const query = `
      UPDATE users
      SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [
      userData.name,
      userData.phone,
      id
    ]);

    return result.affectedRows;
  }

  /**
   * 비밀번호 업데이트
   * @param {number} id - 사용자 ID
   * @param {string} hashedPassword - 해시된 비밀번호
   * @returns {Promise<number>} 수정된 행 수
   */
  static async updatePassword(id, hashedPassword) {
    const query = `
      UPDATE users
      SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [hashedPassword, id]);
    return result.affectedRows;
  }

  /**
   * Refresh Token 저장
   * @param {number} id - 사용자 ID
   * @param {string} refreshToken - Refresh Token
   * @param {Date} expiresAt - 만료 시간
   * @returns {Promise<number>} 수정된 행 수
   */
  static async saveRefreshToken(id, refreshToken, expiresAt) {
    const query = `
      UPDATE users
      SET refresh_token = ?,
          refresh_token_expires_at = ?,
          last_login_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [refreshToken, expiresAt, id]);
    return result.affectedRows;
  }

  /**
   * Refresh Token으로 사용자 조회
   * @param {string} refreshToken - Refresh Token
   * @returns {Promise<Object|undefined>} 사용자 정보 또는 undefined
   */
  static async findByRefreshToken(refreshToken) {
    const query = `
      SELECT * FROM users
      WHERE refresh_token = ?
        AND (refresh_token_expires_at IS NULL OR refresh_token_expires_at > NOW())
    `;
    const [rows] = await db.execute(query, [refreshToken]);
    return rows[0];
  }

  /**
   * Refresh Token 제거 (로그아웃 시)
   * @param {number} id - 사용자 ID
   * @returns {Promise<number>} 수정된 행 수
   */
  static async removeRefreshToken(id) {
    const query = `
      UPDATE users
      SET refresh_token = NULL,
          refresh_token_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [id]);
    return result.affectedRows;
  }

  /**
   * 특정 Refresh Token 제거 (로그아웃 시)
   * @param {string} refreshToken - Refresh Token
   * @returns {Promise<number>} 수정된 행 수
   */
  static async removeRefreshTokenByToken(refreshToken) {
    const query = `
      UPDATE users
      SET refresh_token = NULL,
          refresh_token_expires_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE refresh_token = ?
    `;

    const [result] = await db.execute(query, [refreshToken]);
    return result.affectedRows;
  }

  /**
   * 마지막 로그인 시간 업데이트
   * @param {number} id - 사용자 ID
   * @returns {Promise<number>} 수정된 행 수
   */
  static async updateLastLogin(id) {
    const query = `
      UPDATE users
      SET last_login_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    const [result] = await db.execute(query, [id]);
    return result.affectedRows;
  }
}

module.exports = UserModel;
