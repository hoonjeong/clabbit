const db = require('../config/database');

class ConsultationMessageModel {
    /**
     * 메시지 전송
     * @param {number} academyId 학원 ID
     * @param {Object} messageData 메시지 데이터
     * @returns {Promise<Object>} 전송된 메시지
     */
    static async send(academyId, messageData) {
        const {
            consultation_id,
            student_id,
            sender_id,
            sender_type,
            receiver_id,
            receiver_type,
            message_content,
            message_type = 'text',
            attachment_url
        } = messageData;

        const query = `
            INSERT INTO consultation_messages (
                academy_id, consultation_id, student_id, sender_id, sender_type,
                receiver_id, receiver_type, message_content, message_type,
                attachment_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.execute(query, [
            academyId,
            consultation_id || null,
            student_id,
            sender_id,
            sender_type,
            receiver_id,
            receiver_type,
            message_content,
            message_type,
            attachment_url || null
        ]);

        // WebSocket으로 실시간 알림 전송
        const webSocketServer = require('../config/websocket');
        if (webSocketServer.isUserOnline(receiver_id)) {
            webSocketServer.sendNotificationToUser(receiver_id, 'consultation:newMessage', {
                messageId: result.insertId,
                senderId: sender_id,
                studentId: student_id,
                message: message_content,
                timestamp: new Date()
            });
        }

        return {
            id: result.insertId,
            academy_id: academyId,
            ...messageData,
            sent_at: new Date()
        };
    }

    /**
     * 대화 목록 조회
     * @param {number} academyId 학원 ID
     * @param {number} userId 사용자 ID
     * @param {string} userType 사용자 유형
     * @returns {Promise<Array>} 대화 목록
     */
    static async getConversations(academyId, userId, userType) {
        const query = `
            SELECT
                cm.student_id,
                s.name as student_name,
                s.grade as student_grade,
                s.school,
                MAX(cm.sent_at) as last_message_time,
                (
                    SELECT message_content
                    FROM consultation_messages
                    WHERE student_id = cm.student_id
                    AND ((sender_id = ? AND sender_type = ?) OR (receiver_id = ? AND receiver_type = ?))
                    AND academy_id = ?
                    ORDER BY sent_at DESC
                    LIMIT 1
                ) as last_message,
                COUNT(CASE WHEN cm.receiver_id = ? AND cm.receiver_type = ? AND cm.is_read = FALSE THEN 1 END) as unread_count
            FROM consultation_messages cm
            JOIN students s ON cm.student_id = s.id
            WHERE cm.academy_id = ?
            AND ((cm.sender_id = ? AND cm.sender_type = ?) OR (cm.receiver_id = ? AND cm.receiver_type = ?))
            AND cm.is_deleted = FALSE
            GROUP BY cm.student_id
            ORDER BY last_message_time DESC
        `;

        const params = [
            userId, userType, userId, userType, academyId,
            userId, userType,
            academyId,
            userId, userType, userId, userType
        ];

        const [rows] = await db.execute(query, params);
        return rows;
    }

    /**
     * 메시지 목록 조회 (특정 대화)
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {number} userId 사용자 ID
     * @param {string} userType 사용자 유형
     * @param {Object} options 옵션
     * @returns {Promise<Array>} 메시지 목록
     */
    static async getMessages(academyId, studentId, userId, userType, options = {}) {
        let query = `
            SELECT cm.*,
                   CASE
                       WHEN cm.sender_type = 'teacher' THEN u1.name
                       WHEN cm.sender_type = 'parent' THEN s.parent_name
                       WHEN cm.sender_type = 'student' THEN s.name
                   END as sender_name,
                   CASE
                       WHEN cm.receiver_type = 'teacher' THEN u2.name
                       WHEN cm.receiver_type = 'parent' THEN s.parent_name
                       WHEN cm.receiver_type = 'student' THEN s.name
                   END as receiver_name
            FROM consultation_messages cm
            JOIN students s ON cm.student_id = s.id
            LEFT JOIN users u1 ON cm.sender_id = u1.id AND cm.sender_type = 'teacher'
            LEFT JOIN users u2 ON cm.receiver_id = u2.id AND cm.receiver_type = 'teacher'
            WHERE cm.academy_id = ? AND cm.student_id = ?
            AND ((cm.sender_id = ? AND cm.sender_type = ?) OR (cm.receiver_id = ? AND cm.receiver_type = ?))
            AND cm.is_deleted = FALSE
        `;

        const params = [academyId, studentId, userId, userType, userId, userType];

        // 날짜 필터
        if (options.from_date) {
            query += ' AND cm.sent_at >= ?';
            params.push(options.from_date);
        }

        query += ' ORDER BY cm.sent_at DESC';

        // 페이지네이션
        if (options.limit) {
            const offset = options.offset || 0;
            query += ' LIMIT ? OFFSET ?';
            params.push(parseInt(options.limit), parseInt(offset));
        }

        const [rows] = await db.execute(query, params);

        // 메시지 읽음 처리
        await this.markAsRead(academyId, studentId, userId, userType);

        return rows.reverse(); // 시간순으로 정렬
    }

    /**
     * 메시지 읽음 처리
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {number} userId 사용자 ID
     * @param {string} userType 사용자 유형
     * @returns {Promise<number>} 업데이트된 메시지 수
     */
    static async markAsRead(academyId, studentId, userId, userType) {
        const query = `
            UPDATE consultation_messages
            SET is_read = TRUE, read_at = NOW()
            WHERE academy_id = ? AND student_id = ?
            AND receiver_id = ? AND receiver_type = ?
            AND is_read = FALSE
        `;

        const [result] = await db.execute(query, [academyId, studentId, userId, userType]);
        return result.affectedRows;
    }

    /**
     * 읽지 않은 메시지 수 조회
     * @param {number} academyId 학원 ID
     * @param {number} userId 사용자 ID
     * @param {string} userType 사용자 유형
     * @returns {Promise<number>} 읽지 않은 메시지 수
     */
    static async getUnreadCount(academyId, userId, userType) {
        const query = `
            SELECT COUNT(*) as unread_count
            FROM consultation_messages
            WHERE academy_id = ? AND receiver_id = ? AND receiver_type = ?
            AND is_read = FALSE AND is_deleted = FALSE
        `;

        const [rows] = await db.execute(query, [academyId, userId, userType]);
        return rows[0].unread_count;
    }

    /**
     * 메시지 삭제 (소프트 삭제)
     * @param {number} academyId 학원 ID
     * @param {number} messageId 메시지 ID
     * @param {number} userId 사용자 ID
     * @returns {Promise<boolean>} 삭제 성공 여부
     */
    static async delete(academyId, messageId, userId) {
        const query = `
            UPDATE consultation_messages
            SET is_deleted = TRUE
            WHERE academy_id = ? AND id = ?
            AND (sender_id = ? OR receiver_id = ?)
        `;

        const [result] = await db.execute(query, [academyId, messageId, userId, userId]);
        return result.affectedRows > 0;
    }

    /**
     * 대화를 상담 기록으로 변환
     * @param {number} academyId 학원 ID
     * @param {number} studentId 학생 ID
     * @param {Object} consultationData 상담 데이터
     * @returns {Promise<Object>} 생성된 상담 기록
     */
    static async convertToConsultation(academyId, studentId, consultationData) {
        const connection = await db.getConnection();

        try {
            await connection.beginTransaction();

            // 메시지 내용 조회
            const [messages] = await connection.execute(`
                SELECT cm.*, u.name as sender_name
                FROM consultation_messages cm
                LEFT JOIN users u ON cm.sender_id = u.id AND cm.sender_type = 'teacher'
                WHERE cm.academy_id = ? AND cm.student_id = ?
                AND cm.sent_at >= ? AND cm.sent_at <= ?
                ORDER BY cm.sent_at
            `, [academyId, studentId, consultationData.from_date, consultationData.to_date]);

            // 메시지 내용을 상담 내용으로 변환
            const consultationContent = messages
                .map(m => `[${m.sent_at}] ${m.sender_name || '학부모'}: ${m.message_content}`)
                .join('\n');

            // 상담 기록 생성
            const ConsultationModel = require('./consultation.model');
            const consultation = await ConsultationModel.create(academyId, {
                student_id: studentId,
                category_id: consultationData.category_id,
                consultation_date: new Date(),
                consultant_id: consultationData.consultant_id,
                consultation_method: '앱',
                consultation_content: consultationContent,
                consultation_purpose: consultationData.purpose || '상담톡 대화 내용',
                status: 'completed'
            });

            // 메시지에 상담 ID 연결
            await connection.execute(`
                UPDATE consultation_messages
                SET consultation_id = ?
                WHERE academy_id = ? AND student_id = ?
                AND sent_at >= ? AND sent_at <= ?
            `, [consultation.id, academyId, studentId, consultationData.from_date, consultationData.to_date]);

            await connection.commit();
            return consultation;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    /**
     * 메시지 검색
     * @param {number} academyId 학원 ID
     * @param {string} searchTerm 검색어
     * @param {Object} options 옵션
     * @returns {Promise<Array>} 검색 결과
     */
    static async search(academyId, searchTerm, options = {}) {
        let query = `
            SELECT cm.*,
                   s.name as student_name,
                   s.grade as student_grade,
                   u.name as teacher_name
            FROM consultation_messages cm
            JOIN students s ON cm.student_id = s.id
            LEFT JOIN users u ON (cm.sender_id = u.id AND cm.sender_type = 'teacher')
                              OR (cm.receiver_id = u.id AND cm.receiver_type = 'teacher')
            WHERE cm.academy_id = ?
            AND cm.message_content LIKE ?
            AND cm.is_deleted = FALSE
        `;

        const params = [academyId, `%${searchTerm}%`];

        if (options.student_id) {
            query += ' AND cm.student_id = ?';
            params.push(options.student_id);
        }

        if (options.user_id && options.user_type) {
            query += ' AND ((cm.sender_id = ? AND cm.sender_type = ?) OR (cm.receiver_id = ? AND cm.receiver_type = ?))';
            params.push(options.user_id, options.user_type, options.user_id, options.user_type);
        }

        query += ' ORDER BY cm.sent_at DESC LIMIT 50';

        const [rows] = await db.execute(query, params);
        return rows;
    }
}

module.exports = ConsultationMessageModel;