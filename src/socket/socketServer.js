const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const MessageModel = require('../models/message.model');
const NotificationModel = require('../models/notification.model');

class SocketServer {
    constructor() {
        this.io = null;
        this.users = new Map(); // userId -> socketId mapping
        this.sockets = new Map(); // socketId -> userId mapping
    }

    /**
     * WebSocket 서버 초기화
     */
    init(server) {
        this.io = socketIO(server, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:3000',
                methods: ['GET', 'POST']
            },
            transports: ['websocket', 'polling']
        });

        // 인증 미들웨어
        this.io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error('Authentication error'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
                socket.userId = decoded.userId;
                socket.academyId = socket.handshake.auth.academyId;
                next();
            } catch (err) {
                next(new Error('Authentication error'));
            }
        });

        // 연결 처리
        this.io.on('connection', (socket) => {
            console.log(`User ${socket.userId} connected`);
            this.handleConnection(socket);

            // 이벤트 핸들러 등록
            this.registerEventHandlers(socket);

            // 연결 종료 처리
            socket.on('disconnect', () => {
                console.log(`User ${socket.userId} disconnected`);
                this.handleDisconnection(socket);
            });
        });

        return this.io;
    }

    /**
     * 사용자 연결 처리
     */
    handleConnection(socket) {
        const userId = socket.userId;
        const oldSocketId = this.users.get(userId);

        // 기존 연결이 있으면 종료
        if (oldSocketId && oldSocketId !== socket.id) {
            const oldSocket = this.io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
                oldSocket.disconnect();
            }
        }

        // 새 연결 등록
        this.users.set(userId, socket.id);
        this.sockets.set(socket.id, userId);

        // 학원별 룸 참가
        if (socket.academyId) {
            socket.join(`academy:${socket.academyId}`);
        }

        // 개인 룸 참가
        socket.join(`user:${userId}`);

        // 온라인 상태 브로드캐스트
        this.broadcastUserStatus(userId, 'online');
    }

    /**
     * 사용자 연결 종료 처리
     */
    handleDisconnection(socket) {
        const userId = socket.userId;

        // 매핑 제거
        this.users.delete(userId);
        this.sockets.delete(socket.id);

        // 오프라인 상태 브로드캐스트
        this.broadcastUserStatus(userId, 'offline');
    }

    /**
     * 이벤트 핸들러 등록
     */
    registerEventHandlers(socket) {
        // 메시지 전송
        socket.on('send-message', async (data) => {
            await this.handleSendMessage(socket, data);
        });

        // 메시지 읽음 처리
        socket.on('mark-read', async (data) => {
            await this.handleMarkRead(socket, data);
        });

        // 타이핑 상태
        socket.on('typing', (data) => {
            this.handleTyping(socket, data);
        });

        socket.on('stop-typing', (data) => {
            this.handleStopTyping(socket, data);
        });

        // 대화방 참가/나가기
        socket.on('join-conversation', (conversationId) => {
            socket.join(`conversation:${conversationId}`);
        });

        socket.on('leave-conversation', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });

        // 알림 관련
        socket.on('notification-read', async (notificationId) => {
            await this.handleNotificationRead(socket, notificationId);
        });

        // 화면 공유 (화상 수업용)
        socket.on('start-screen-share', (data) => {
            this.handleScreenShare(socket, data);
        });

        socket.on('stop-screen-share', (data) => {
            this.handleStopScreenShare(socket, data);
        });
    }

    /**
     * 메시지 전송 처리
     */
    async handleSendMessage(socket, data) {
        try {
            const { conversationId, content, type, attachments } = data;

            // 메시지 저장
            const message = await MessageModel.create(
                socket.academyId,
                {
                    conversation_id: conversationId,
                    sender_id: socket.userId,
                    content,
                    type: type || 'text',
                    attachments
                }
            );

            // 대화 참여자에게 전송
            this.io.to(`conversation:${conversationId}`).emit('new-message', {
                ...message,
                sender: {
                    id: socket.userId,
                    name: data.senderName // 클라이언트에서 전송
                }
            });

            // 오프라인 사용자에게 알림 생성
            await this.createOfflineNotifications(conversationId, socket.userId, content);

        } catch (error) {
            console.error('Message send error:', error);
            socket.emit('message-error', {
                error: error.message
            });
        }
    }

    /**
     * 메시지 읽음 처리
     */
    async handleMarkRead(socket, data) {
        try {
            const { conversationId, messageIds } = data;

            // 읽음 상태 업데이트
            await MessageModel.markAsRead(
                socket.academyId,
                messageIds,
                socket.userId
            );

            // 대화 참여자에게 알림
            socket.to(`conversation:${conversationId}`).emit('messages-read', {
                conversationId,
                messageIds,
                userId: socket.userId
            });

        } catch (error) {
            console.error('Mark read error:', error);
        }
    }

    /**
     * 타이핑 상태 처리
     */
    handleTyping(socket, data) {
        const { conversationId } = data;
        socket.to(`conversation:${conversationId}`).emit('user-typing', {
            conversationId,
            userId: socket.userId,
            userName: data.userName
        });
    }

    /**
     * 타이핑 중지 처리
     */
    handleStopTyping(socket, data) {
        const { conversationId } = data;
        socket.to(`conversation:${conversationId}`).emit('user-stop-typing', {
            conversationId,
            userId: socket.userId
        });
    }

    /**
     * 알림 읽음 처리
     */
    async handleNotificationRead(socket, notificationId) {
        try {
            await NotificationModel.markAsRead(
                socket.academyId,
                notificationId,
                socket.userId
            );

            socket.emit('notification-updated', {
                notificationId,
                is_read: true
            });

        } catch (error) {
            console.error('Notification read error:', error);
        }
    }

    /**
     * 화면 공유 시작
     */
    handleScreenShare(socket, data) {
        const { sessionId } = data;
        socket.to(`session:${sessionId}`).emit('screen-share-started', {
            userId: socket.userId,
            streamId: data.streamId
        });
    }

    /**
     * 화면 공유 중지
     */
    handleStopScreenShare(socket, data) {
        const { sessionId } = data;
        socket.to(`session:${sessionId}`).emit('screen-share-stopped', {
            userId: socket.userId
        });
    }

    /**
     * 사용자 상태 브로드캐스트
     */
    broadcastUserStatus(userId, status) {
        // 해당 사용자와 대화 중인 모든 사용자에게 알림
        this.io.emit('user-status-changed', {
            userId,
            status
        });
    }

    /**
     * 오프라인 사용자 알림 생성
     */
    async createOfflineNotifications(conversationId, senderId, content) {
        try {
            // 대화 참여자 조회
            const participants = await MessageModel.getConversationParticipants(conversationId);

            // 오프라인 사용자 필터링
            const offlineUsers = participants.filter(p =>
                p.user_id !== senderId && !this.users.has(p.user_id)
            );

            // 알림 생성
            for (const user of offlineUsers) {
                await NotificationModel.create({
                    academy_id: user.academy_id,
                    user_id: user.user_id,
                    type: 'message',
                    title: '새 메시지',
                    content: content.substring(0, 100),
                    related_id: conversationId
                });
            }

        } catch (error) {
            console.error('Offline notification error:', error);
        }
    }

    /**
     * 특정 사용자에게 이벤트 전송
     */
    emitToUser(userId, event, data) {
        const socketId = this.users.get(userId);
        if (socketId) {
            this.io.to(socketId).emit(event, data);
        }
    }

    /**
     * 학원 전체에 이벤트 전송
     */
    emitToAcademy(academyId, event, data) {
        this.io.to(`academy:${academyId}`).emit(event, data);
    }

    /**
     * 대화방에 이벤트 전송
     */
    emitToConversation(conversationId, event, data) {
        this.io.to(`conversation:${conversationId}`).emit(event, data);
    }

    /**
     * 온라인 사용자 목록 조회
     */
    getOnlineUsers(academyId) {
        const onlineUsers = [];

        for (const [userId, socketId] of this.users.entries()) {
            const socket = this.io.sockets.sockets.get(socketId);
            if (socket && socket.academyId === academyId) {
                onlineUsers.push(userId);
            }
        }

        return onlineUsers;
    }
}

// 싱글톤 인스턴스
const socketServer = new SocketServer();

module.exports = socketServer;