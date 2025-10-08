const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class SecurityService {
    constructor() {
        this.maxLoginAttempts = 5;
        this.lockoutDuration = 30 * 60 * 1000; // 30 minutes
        this.sessionTimeout = 60 * 60 * 1000; // 1 hour
        this.passwordMinLength = 8;
        this.passwordRequirements = {
            uppercase: true,
            lowercase: true,
            number: true,
            special: true
        };
    }

    // ================== 2FA (Two-Factor Authentication) ==================

    // 2FA 설정 초기화
    async setup2FA(userId) {
        try {
            // 사용자 정보 조회
            const [users] = await db.execute(
                'SELECT name, email FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length) {
                throw new Error('User not found');
            }

            const user = users[0];

            // Secret 생성
            const secret = speakeasy.generateSecret({
                name: `클래빗 (${user.email})`,
                issuer: 'Clabbit',
                length: 32
            });

            // QR 코드 생성
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            // 임시 저장 (아직 활성화하지 않음)
            await db.execute(
                `INSERT INTO two_factor_auth (user_id, secret, is_enabled, created_at)
                VALUES (?, ?, false, NOW())
                ON DUPLICATE KEY UPDATE
                secret = VALUES(secret),
                is_enabled = false,
                created_at = NOW()`,
                [userId, this.encryptSecret(secret.base32)]
            );

            return {
                success: true,
                secret: secret.base32,
                qrCode: qrCodeUrl,
                manualEntryKey: secret.base32,
                backupCodes: await this.generateBackupCodes(userId)
            };
        } catch (error) {
            console.error('2FA setup error:', error);
            throw error;
        }
    }

    // 2FA 활성화 (검증 후)
    async enable2FA(userId, token) {
        try {
            // Secret 조회
            const [authRecords] = await db.execute(
                'SELECT secret FROM two_factor_auth WHERE user_id = ?',
                [userId]
            );

            if (!authRecords.length) {
                throw new Error('2FA not set up');
            }

            const decryptedSecret = this.decryptSecret(authRecords[0].secret);

            // 토큰 검증
            const verified = speakeasy.totp.verify({
                secret: decryptedSecret,
                encoding: 'base32',
                token: token,
                window: 2
            });

            if (!verified) {
                return { success: false, error: 'Invalid verification code' };
            }

            // 2FA 활성화
            await db.execute(
                'UPDATE two_factor_auth SET is_enabled = true, enabled_at = NOW() WHERE user_id = ?',
                [userId]
            );

            // 보안 이벤트 로그
            await this.logSecurityEvent(userId, 'TWO_FACTOR_ENABLED', {
                method: 'TOTP'
            });

            return { success: true, message: '2FA가 성공적으로 활성화되었습니다' };
        } catch (error) {
            console.error('2FA enable error:', error);
            throw error;
        }
    }

    // 2FA 검증
    async verify2FA(userId, token) {
        try {
            // 2FA 정보 조회
            const [authRecords] = await db.execute(
                'SELECT secret, is_enabled FROM two_factor_auth WHERE user_id = ?',
                [userId]
            );

            if (!authRecords.length || !authRecords[0].is_enabled) {
                return { success: false, error: '2FA not enabled' };
            }

            const decryptedSecret = this.decryptSecret(authRecords[0].secret);

            // TOTP 토큰 검증
            const verified = speakeasy.totp.verify({
                secret: decryptedSecret,
                encoding: 'base32',
                token: token,
                window: 2 // 시간 창 허용 (앞뒤 2단계)
            });

            if (verified) {
                // 마지막 사용 시간 업데이트
                await db.execute(
                    'UPDATE two_factor_auth SET last_used = NOW() WHERE user_id = ?',
                    [userId]
                );

                return { success: true };
            }

            // 백업 코드 확인
            const backupVerified = await this.verifyBackupCode(userId, token);
            if (backupVerified) {
                return { success: true, usedBackupCode: true };
            }

            return { success: false, error: 'Invalid 2FA code' };
        } catch (error) {
            console.error('2FA verify error:', error);
            throw error;
        }
    }

    // 2FA 비활성화
    async disable2FA(userId, password) {
        try {
            // 비밀번호 확인
            const [users] = await db.execute(
                'SELECT password FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length) {
                throw new Error('User not found');
            }

            const passwordMatch = await bcrypt.compare(password, users[0].password);
            if (!passwordMatch) {
                return { success: false, error: 'Invalid password' };
            }

            // 2FA 비활성화
            await db.execute(
                'UPDATE two_factor_auth SET is_enabled = false WHERE user_id = ?',
                [userId]
            );

            // 백업 코드 삭제
            await db.execute(
                'DELETE FROM two_factor_backup_codes WHERE user_id = ?',
                [userId]
            );

            // 보안 이벤트 로그
            await this.logSecurityEvent(userId, 'TWO_FACTOR_DISABLED', {});

            return { success: true, message: '2FA가 비활성화되었습니다' };
        } catch (error) {
            console.error('2FA disable error:', error);
            throw error;
        }
    }

    // 백업 코드 생성
    async generateBackupCodes(userId, count = 10) {
        const codes = [];

        // 기존 백업 코드 삭제
        await db.execute(
            'DELETE FROM two_factor_backup_codes WHERE user_id = ?',
            [userId]
        );

        // 새 백업 코드 생성
        for (let i = 0; i < count; i++) {
            const code = this.generateSecureToken(8);
            const hashedCode = await bcrypt.hash(code, 10);

            await db.execute(
                'INSERT INTO two_factor_backup_codes (user_id, code, is_used) VALUES (?, ?, false)',
                [userId, hashedCode]
            );

            codes.push(code);
        }

        return codes;
    }

    // 백업 코드 검증
    async verifyBackupCode(userId, code) {
        try {
            const [backupCodes] = await db.execute(
                'SELECT id, code FROM two_factor_backup_codes WHERE user_id = ? AND is_used = false',
                [userId]
            );

            for (const backup of backupCodes) {
                const match = await bcrypt.compare(code, backup.code);
                if (match) {
                    // 사용 처리
                    await db.execute(
                        'UPDATE two_factor_backup_codes SET is_used = true, used_at = NOW() WHERE id = ?',
                        [backup.id]
                    );

                    // 보안 이벤트 로그
                    await this.logSecurityEvent(userId, 'BACKUP_CODE_USED', {
                        codeId: backup.id
                    });

                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Backup code verify error:', error);
            return false;
        }
    }

    // ================== 로그인 보안 ==================

    // 로그인 시도 기록
    async recordLoginAttempt(email, success, ipAddress, userAgent) {
        try {
            // 사용자 조회
            const [users] = await db.execute(
                'SELECT id FROM users WHERE email = ?',
                [email]
            );

            const userId = users.length ? users[0].id : null;

            if (success) {
                // 성공한 로그인
                if (userId) {
                    await db.execute(
                        'UPDATE users SET last_login = NOW(), login_attempts = 0 WHERE id = ?',
                        [userId]
                    );

                    await this.logSecurityEvent(userId, 'LOGIN_SUCCESS', {
                        ipAddress,
                        userAgent
                    });
                }
            } else {
                // 실패한 로그인
                if (userId) {
                    // 로그인 시도 횟수 증가
                    await db.execute(
                        'UPDATE users SET login_attempts = login_attempts + 1 WHERE id = ?',
                        [userId]
                    );

                    // 로그인 실패 기록
                    await db.execute(
                        `INSERT INTO login_failures
                        (user_id, email, ip_address, user_agent, attempted_at)
                        VALUES (?, ?, ?, ?, NOW())`,
                        [userId, email, ipAddress, userAgent]
                    );

                    // 계정 잠금 확인
                    const [userInfo] = await db.execute(
                        'SELECT login_attempts FROM users WHERE id = ?',
                        [userId]
                    );

                    if (userInfo[0].login_attempts >= this.maxLoginAttempts) {
                        await this.lockAccount(userId);
                    }
                }

                await this.logSecurityEvent(userId, 'LOGIN_FAILED', {
                    email,
                    ipAddress,
                    userAgent
                });
            }
        } catch (error) {
            console.error('Record login attempt error:', error);
        }
    }

    // 계정 잠금
    async lockAccount(userId) {
        try {
            const unlockTime = new Date(Date.now() + this.lockoutDuration);

            await db.execute(
                'UPDATE users SET is_locked = true, locked_until = ? WHERE id = ?',
                [unlockTime, userId]
            );

            await this.logSecurityEvent(userId, 'ACCOUNT_LOCKED', {
                lockedUntil: unlockTime
            });

            // 이메일 알림 발송
            // await NotificationService.send(...)

            return true;
        } catch (error) {
            console.error('Lock account error:', error);
            return false;
        }
    }

    // 계정 잠금 해제
    async unlockAccount(userId) {
        try {
            await db.execute(
                'UPDATE users SET is_locked = false, locked_until = NULL, login_attempts = 0 WHERE id = ?',
                [userId]
            );

            await this.logSecurityEvent(userId, 'ACCOUNT_UNLOCKED', {});

            return true;
        } catch (error) {
            console.error('Unlock account error:', error);
            return false;
        }
    }

    // 계정 잠금 상태 확인
    async isAccountLocked(userId) {
        try {
            const [users] = await db.execute(
                'SELECT is_locked, locked_until FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length) {
                return false;
            }

            const user = users[0];

            if (user.is_locked) {
                // 잠금 시간 만료 확인
                if (user.locked_until && new Date(user.locked_until) <= new Date()) {
                    await this.unlockAccount(userId);
                    return false;
                }
                return true;
            }

            return false;
        } catch (error) {
            console.error('Check account lock error:', error);
            return false;
        }
    }

    // ================== 비밀번호 보안 ==================

    // 비밀번호 강도 검사
    validatePasswordStrength(password) {
        const errors = [];

        if (password.length < this.passwordMinLength) {
            errors.push(`비밀번호는 최소 ${this.passwordMinLength}자 이상이어야 합니다`);
        }

        if (this.passwordRequirements.uppercase && !/[A-Z]/.test(password)) {
            errors.push('대문자를 포함해야 합니다');
        }

        if (this.passwordRequirements.lowercase && !/[a-z]/.test(password)) {
            errors.push('소문자를 포함해야 합니다');
        }

        if (this.passwordRequirements.number && !/\d/.test(password)) {
            errors.push('숫자를 포함해야 합니다');
        }

        if (this.passwordRequirements.special && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
            errors.push('특수문자를 포함해야 합니다');
        }

        return {
            valid: errors.length === 0,
            errors,
            strength: this.calculatePasswordStrength(password)
        };
    }

    // 비밀번호 강도 계산
    calculatePasswordStrength(password) {
        let strength = 0;

        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (password.length >= 16) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;

        const strengthLevels = ['very-weak', 'weak', 'fair', 'good', 'strong', 'very-strong'];
        const level = Math.min(Math.floor((strength / 7) * 5), 5);

        return {
            score: strength,
            level: strengthLevels[level],
            percentage: Math.round((strength / 7) * 100)
        };
    }

    // 비밀번호 이력 확인
    async checkPasswordHistory(userId, newPassword) {
        try {
            const [history] = await db.execute(
                `SELECT password_hash FROM password_history
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT 5`,
                [userId]
            );

            for (const record of history) {
                const match = await bcrypt.compare(newPassword, record.password_hash);
                if (match) {
                    return {
                        reused: true,
                        message: '최근 5개의 비밀번호와 동일한 비밀번호는 사용할 수 없습니다'
                    };
                }
            }

            return { reused: false };
        } catch (error) {
            console.error('Check password history error:', error);
            return { reused: false };
        }
    }

    // 비밀번호 변경
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // 현재 비밀번호 확인
            const [users] = await db.execute(
                'SELECT password FROM users WHERE id = ?',
                [userId]
            );

            if (!users.length) {
                throw new Error('User not found');
            }

            const passwordMatch = await bcrypt.compare(currentPassword, users[0].password);
            if (!passwordMatch) {
                return { success: false, error: 'Current password is incorrect' };
            }

            // 비밀번호 강도 검사
            const strengthCheck = this.validatePasswordStrength(newPassword);
            if (!strengthCheck.valid) {
                return {
                    success: false,
                    errors: strengthCheck.errors
                };
            }

            // 비밀번호 이력 확인
            const historyCheck = await this.checkPasswordHistory(userId, newPassword);
            if (historyCheck.reused) {
                return {
                    success: false,
                    error: historyCheck.message
                };
            }

            // 새 비밀번호 해시
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // 비밀번호 업데이트
            await db.execute(
                'UPDATE users SET password = ?, password_changed_at = NOW() WHERE id = ?',
                [hashedPassword, userId]
            );

            // 비밀번호 이력 저장
            await db.execute(
                'INSERT INTO password_history (user_id, password_hash) VALUES (?, ?)',
                [userId, hashedPassword]
            );

            // 보안 이벤트 로그
            await this.logSecurityEvent(userId, 'PASSWORD_CHANGED', {});

            return { success: true, message: '비밀번호가 변경되었습니다' };
        } catch (error) {
            console.error('Change password error:', error);
            throw error;
        }
    }

    // ================== 세션 보안 ==================

    // 안전한 세션 토큰 생성
    generateSessionToken(userId) {
        const payload = {
            userId,
            sessionId: this.generateSecureToken(16),
            createdAt: Date.now()
        };

        return jwt.sign(payload, process.env.SESSION_SECRET || 'your-session-secret', {
            expiresIn: '1h'
        });
    }

    // 세션 검증
    verifySessionToken(token) {
        try {
            const decoded = jwt.verify(token, process.env.SESSION_SECRET || 'your-session-secret');

            // 세션 타임아웃 확인
            if (Date.now() - decoded.createdAt > this.sessionTimeout) {
                return { valid: false, error: 'Session expired' };
            }

            return { valid: true, payload: decoded };
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }

    // 활성 세션 조회
    async getActiveSessions(userId) {
        try {
            const [sessions] = await db.execute(
                `SELECT * FROM user_sessions
                WHERE user_id = ?
                AND expires_at > NOW()
                ORDER BY created_at DESC`,
                [userId]
            );

            return sessions;
        } catch (error) {
            console.error('Get active sessions error:', error);
            return [];
        }
    }

    // 세션 종료
    async terminateSession(userId, sessionId) {
        try {
            await db.execute(
                'DELETE FROM user_sessions WHERE user_id = ? AND session_id = ?',
                [userId, sessionId]
            );

            await this.logSecurityEvent(userId, 'SESSION_TERMINATED', { sessionId });

            return true;
        } catch (error) {
            console.error('Terminate session error:', error);
            return false;
        }
    }

    // ================== 보안 이벤트 로깅 ==================

    // 보안 이벤트 기록
    async logSecurityEvent(userId, eventType, details) {
        try {
            await db.execute(
                `INSERT INTO security_events
                (user_id, event_type, details, ip_address, created_at)
                VALUES (?, ?, ?, ?, NOW())`,
                [userId, eventType, JSON.stringify(details), details.ipAddress || '127.0.0.1']
            );
        } catch (error) {
            console.error('Log security event error:', error);
        }
    }

    // 의심스러운 활동 감지
    async detectSuspiciousActivity(userId) {
        try {
            // 최근 보안 이벤트 조회
            const [events] = await db.execute(
                `SELECT event_type, COUNT(*) as count
                FROM security_events
                WHERE user_id = ?
                AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
                GROUP BY event_type`,
                [userId]
            );

            const suspiciousPatterns = {
                LOGIN_FAILED: 5,
                PASSWORD_RESET_REQUESTED: 3,
                TWO_FACTOR_FAILED: 5
            };

            for (const event of events) {
                if (suspiciousPatterns[event.event_type] &&
                    event.count >= suspiciousPatterns[event.event_type]) {
                    await this.handleSuspiciousActivity(userId, event.event_type, event.count);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Detect suspicious activity error:', error);
            return false;
        }
    }

    // 의심스러운 활동 처리
    async handleSuspiciousActivity(userId, activityType, count) {
        // 알림 발송
        // 계정 잠금 고려
        // 관리자 알림

        await this.logSecurityEvent(userId, 'SUSPICIOUS_ACTIVITY_DETECTED', {
            activityType,
            count
        });
    }

    // ================== Helper Methods ==================

    // 안전한 랜덤 토큰 생성
    generateSecureToken(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Secret 암호화
    encryptSecret(secret) {
        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here', 'utf8');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(algorithm, key, iv);

        let encrypted = cipher.update(secret, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }

    // Secret 복호화
    decryptSecret(encryptedSecret) {
        const parts = encryptedSecret.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const algorithm = 'aes-256-gcm';
        const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here', 'utf8');
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    // IP 주소 위치 확인 (선택적)
    async checkIpLocation(ipAddress) {
        // IP 위치 확인 API 연동
        // 이상한 위치에서의 로그인 감지
        return null;
    }
}

module.exports = new SecurityService();