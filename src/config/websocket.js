/**
 * WebSocket 서버 설정
 * Socket.io를 사용한 실시간 메시징 시스템
 */

const socketIO = require('socket.io');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

class WebSocketServer {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> socketId mapping
        this.userSockets = new Map(); // socketId -> userData mapping
    }

    /**
     * WebSocket 서버 초기화
     * @param {Object} server - HTTP 서버 인스턴스
     * @param {Object} sessionStore - Express 세션 스토어
     */
    initialize(server, sessionStore) {
        this.io = socketIO(server, {
            cors: {
                origin: process.env.CLIENT_URL || "http://localhost:3000",
                credentials: true
            }
        });

        // 세션 미들웨어 공유
        this.io.use((socket, next) => {
            const req = socket.request;
            const res = {};

            // Express 세션 미들웨어 래핑
            const sessionMiddleware = session({
                key: 'clabbit_session',
                secret: process.env.SESSION_SECRET,
                store: sessionStore,
                resave: false,
                saveUninitialized: false
            });

            sessionMiddleware(req, res, () => {
                if (req.session && req.session.userId) {
                    socket.userId = req.session.userId;
                    socket.academyId = req.session.academyId;
                    socket.userName = req.session.userName;
                    next();
                } else {
                    next(new Error('Authentication failed'));
                }
            });
        });

        // 연결 이벤트 처리
        this.io.on('connection', (socket) => {
            console.log(`User connected: ${socket.userId} (${socket.userName})`);

            // 사용자 연결 정보 저장
            this.connectedUsers.set(socket.userId, socket.id);
            this.userSockets.set(socket.id, {
                userId: socket.userId,
                academyId: socket.academyId,
                userName: socket.userName
            });

            // 사용자별 룸 참가 (개인 메시지용)
            socket.join(`user:${socket.userId}`);

            // 학원별 룸 참가
            if (socket.academyId) {
                socket.join(`academy:${socket.academyId}`);
            }

            // 온라인 상태 브로드캐스트
            this.broadcastUserStatus(socket.userId, 'online');

            // 이벤트 핸들러 등록
            this.registerHandlers(socket);

            // 연결 해제 처리
            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.userId}`);
                this.connectedUsers.delete(socket.userId);
                this.userSockets.delete(socket.id);
                this.broadcastUserStatus(socket.userId, 'offline');
            });
        });

        console.log('WebSocket server initialized');
    }

    /**
     * 소켓 이벤트 핸들러 등록
     * @param {Object} socket - Socket.io 소켓 인스턴스
     */
    registerHandlers(socket) {
        // 상담톡 메시지 전송
        socket.on('consultation:message', async (data) => {
            try {
                const { conversationId, recipientId, message, attachments } = data;

                // 메시지 데이터 검증
                if (!conversationId || !message) {
                    socket.emit('error', { message: '필수 정보가 누락되었습니다.' });
                    return;
                }

                // 수신자에게 메시지 전송
                const recipientSocketId = this.connectedUsers.get(recipientId);
                if (recipientSocketId) {
                    this.io.to(recipientSocketId).emit('consultation:newMessage', {
                        conversationId,
                        senderId: socket.userId,
                        senderName: socket.userName,
                        message,
                        attachments,
                        timestamp: new Date()
                    });
                }

                // 발신자에게 전송 확인
                socket.emit('consultation:messageSent', {
                    conversationId,
                    timestamp: new Date()
                });

            } catch (error) {
                console.error('Message send error:', error);
                socket.emit('error', { message: '메시지 전송 실패' });
            }
        });

        // 타이핑 상태 알림
        socket.on('consultation:typing', (data) => {
            const { conversationId, recipientId, isTyping } = data;

            const recipientSocketId = this.connectedUsers.get(recipientId);
            if (recipientSocketId) {
                this.io.to(recipientSocketId).emit('consultation:typingStatus', {
                    conversationId,
                    userId: socket.userId,
                    userName: socket.userName,
                    isTyping
                });
            }
        });

        // 메시지 읽음 처리
        socket.on('consultation:markAsRead', async (data) => {
            const { conversationId, messageIds } = data;

            // 발신자에게 읽음 확인 알림
            const senderSocketId = this.connectedUsers.get(data.senderId);
            if (senderSocketId) {
                this.io.to(senderSocketId).emit('consultation:messagesRead', {
                    conversationId,
                    messageIds,
                    readBy: socket.userId,
                    readAt: new Date()
                });
            }
        });

        // 대화방 참가
        socket.on('consultation:joinConversation', (data) => {
            const { conversationId } = data;
            socket.join(`conversation:${conversationId}`);
            console.log(`User ${socket.userId} joined conversation ${conversationId}`);
        });

        // 대화방 나가기
        socket.on('consultation:leaveConversation', (data) => {
            const { conversationId } = data;
            socket.leave(`conversation:${conversationId}`);
            console.log(`User ${socket.userId} left conversation ${conversationId}`);
        });

        // 시스템 알림
        socket.on('system:notification', (data) => {
            const { type, recipientIds, message } = data;

            recipientIds.forEach(recipientId => {
                const recipientSocketId = this.connectedUsers.get(recipientId);
                if (recipientSocketId) {
                    this.io.to(recipientSocketId).emit('system:alert', {
                        type,
                        message,
                        timestamp: new Date()
                    });
                }
            });
        });
    }

    /**
     * 사용자 온라인 상태 브로드캐스트
     * @param {number} userId - 사용자 ID
     * @param {string} status - 상태 (online/offline)
     */
    broadcastUserStatus(userId, status) {
        this.io.emit('user:statusUpdate', {
            userId,
            status,
            timestamp: new Date()
        });
    }

    /**
     * 특정 사용자에게 알림 전송
     * @param {number} userId - 수신자 ID
     * @param {string} type - 알림 타입
     * @param {Object} data - 알림 데이터
     */
    sendNotificationToUser(userId, type, data) {
        const socketId = this.connectedUsers.get(userId);
        if (socketId) {
            this.io.to(socketId).emit('notification', {
                type,
                ...data,
                timestamp: new Date()
            });
        }
    }

    /**
     * 학원 전체에 알림 전송
     * @param {number} academyId - 학원 ID
     * @param {string} type - 알림 타입
     * @param {Object} data - 알림 데이터
     */
    sendNotificationToAcademy(academyId, type, data) {
        this.io.to(`academy:${academyId}`).emit('notification', {
            type,
            ...data,
            timestamp: new Date()
        });
    }

    /**
     * 연결된 사용자 수 조회
     * @returns {number} 연결된 사용자 수
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }

    /**
     * 특정 사용자의 온라인 여부 확인
     * @param {number} userId - 사용자 ID
     * @returns {boolean} 온라인 여부
     */
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
}

// 싱글톤 인스턴스
const webSocketServer = new WebSocketServer();

module.exports = webSocketServer;