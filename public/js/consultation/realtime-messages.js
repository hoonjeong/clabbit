/**
 * 상담톡 실시간 메시징 클라이언트
 * Socket.io를 사용한 WebSocket 통신
 */

class RealtimeMessaging {
    constructor() {
        this.socket = null;
        this.currentConversationId = null;
        this.currentUserId = null;
        this.typingTimer = null;
        this.isTyping = false;
        this.unreadCounts = new Map();
        this.onlineUsers = new Set();
    }

    /**
     * WebSocket 연결 초기화
     */
    initialize() {
        // Socket.io 연결
        this.socket = io('/', {
            transports: ['websocket'],
            upgrade: false,
            withCredentials: true
        });

        // 연결 이벤트 핸들러
        this.socket.on('connect', () => {
            console.log('WebSocket connected');
            this.onConnected();
        });

        this.socket.on('disconnect', () => {
            console.log('WebSocket disconnected');
            this.onDisconnected();
        });

        this.socket.on('error', (error) => {
            console.error('WebSocket error:', error);
            this.onError(error);
        });

        // 메시지 관련 이벤트
        this.socket.on('consultation:newMessage', (data) => {
            this.onNewMessage(data);
        });

        this.socket.on('consultation:messageSent', (data) => {
            this.onMessageSent(data);
        });

        this.socket.on('consultation:messagesRead', (data) => {
            this.onMessagesRead(data);
        });

        this.socket.on('consultation:messageDeleted', (data) => {
            this.onMessageDeleted(data);
        });

        // 타이핑 관련 이벤트
        this.socket.on('consultation:typingStatus', (data) => {
            this.onTypingStatus(data);
        });

        // 사용자 상태 이벤트
        this.socket.on('user:statusUpdate', (data) => {
            this.onUserStatusUpdate(data);
        });

        // 시스템 알림
        this.socket.on('system:alert', (data) => {
            this.onSystemAlert(data);
        });

        // 일반 알림
        this.socket.on('notification', (data) => {
            this.onNotification(data);
        });
    }

    /**
     * 연결 성공 처리
     */
    onConnected() {
        // 연결 상태 UI 업데이트
        this.updateConnectionStatus('connected');

        // 현재 대화방 재참가
        if (this.currentConversationId) {
            this.joinConversation(this.currentConversationId);
        }
    }

    /**
     * 연결 끊김 처리
     */
    onDisconnected() {
        this.updateConnectionStatus('disconnected');
    }

    /**
     * 에러 처리
     */
    onError(error) {
        console.error('WebSocket error:', error);
        this.showError('연결 오류가 발생했습니다.');
    }

    /**
     * 새 메시지 수신 처리
     */
    onNewMessage(data) {
        const { conversationId, messageId, senderId, senderName, studentId, message, attachments, timestamp } = data;

        // 현재 대화창이 열려있는 경우
        if (this.currentConversationId === conversationId) {
            this.appendMessage({
                id: messageId,
                sender_id: senderId,
                sender_name: senderName,
                message_content: message,
                attachments: attachments,
                sent_at: timestamp,
                type: 'received'
            });

            // 읽음 처리
            this.markMessagesAsRead([messageId]);
        } else {
            // 알림 표시
            this.showNotification({
                title: senderName,
                body: message,
                conversationId: conversationId
            });

            // 읽지 않은 메시지 카운트 증가
            const currentCount = this.unreadCounts.get(conversationId) || 0;
            this.unreadCounts.set(conversationId, currentCount + 1);
            this.updateUnreadBadge(conversationId);
        }

        // 대화 목록 업데이트
        this.updateConversationList(conversationId, message, timestamp);
    }

    /**
     * 메시지 전송 확인 처리
     */
    onMessageSent(data) {
        const { conversationId, timestamp } = data;

        // 전송 중 표시 제거
        this.removeSendingIndicator();

        // 타임스탬프 업데이트
        this.updateLastMessageTime(timestamp);
    }

    /**
     * 메시지 읽음 처리
     */
    onMessagesRead(data) {
        const { conversationId, messageIds, readBy, readAt } = data;

        if (this.currentConversationId === conversationId) {
            // 읽음 표시 UI 업데이트
            messageIds.forEach(messageId => {
                this.markMessageAsRead(messageId, readAt);
            });
        }
    }

    /**
     * 메시지 삭제 처리
     */
    onMessageDeleted(data) {
        const { conversationId, messageId } = data;

        if (this.currentConversationId === conversationId) {
            // 삭제된 메시지 UI에서 제거
            this.removeMessage(messageId);
        }
    }

    /**
     * 타이핑 상태 처리
     */
    onTypingStatus(data) {
        const { conversationId, userId, userName, isTyping } = data;

        if (this.currentConversationId === conversationId) {
            if (isTyping) {
                this.showTypingIndicator(userName);
            } else {
                this.hideTypingIndicator(userName);
            }
        }
    }

    /**
     * 사용자 온라인 상태 업데이트
     */
    onUserStatusUpdate(data) {
        const { userId, status } = data;

        if (status === 'online') {
            this.onlineUsers.add(userId);
        } else {
            this.onlineUsers.delete(userId);
        }

        // UI 업데이트
        this.updateUserStatus(userId, status);
    }

    /**
     * 시스템 알림 처리
     */
    onSystemAlert(data) {
        const { type, message } = data;
        this.showSystemAlert(type, message);
    }

    /**
     * 일반 알림 처리
     */
    onNotification(data) {
        const { type, ...notificationData } = data;

        switch (type) {
            case 'consultation:newMessage':
                this.onNewMessage(notificationData);
                break;
            case 'consultation:messagesRead':
                this.onMessagesRead(notificationData);
                break;
            default:
                console.log('Unknown notification type:', type);
        }
    }

    /**
     * 메시지 전송
     */
    sendMessage(recipientId, studentId, message, attachments = null) {
        if (!this.socket || !this.socket.connected) {
            this.showError('연결이 끊겼습니다. 다시 연결을 시도합니다.');
            return;
        }

        // 전송 중 표시
        this.showSendingIndicator();

        this.socket.emit('consultation:message', {
            conversationId: this.currentConversationId,
            recipientId,
            studentId,
            message,
            attachments
        });

        // 임시로 UI에 메시지 추가 (낙관적 업데이트)
        this.appendMessage({
            id: 'temp-' + Date.now(),
            sender_id: this.currentUserId,
            message_content: message,
            attachments: attachments,
            sent_at: new Date(),
            type: 'sent',
            status: 'sending'
        });
    }

    /**
     * 타이핑 상태 전송
     */
    sendTypingStatus(recipientId, isTyping) {
        if (!this.socket || !this.socket.connected) return;

        this.socket.emit('consultation:typing', {
            conversationId: this.currentConversationId,
            recipientId,
            isTyping
        });
    }

    /**
     * 타이핑 시작
     */
    startTyping(recipientId) {
        if (!this.isTyping) {
            this.isTyping = true;
            this.sendTypingStatus(recipientId, true);
        }

        // 기존 타이머 취소
        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }

        // 3초 후 타이핑 중지
        this.typingTimer = setTimeout(() => {
            this.stopTyping(recipientId);
        }, 3000);
    }

    /**
     * 타이핑 중지
     */
    stopTyping(recipientId) {
        if (this.isTyping) {
            this.isTyping = false;
            this.sendTypingStatus(recipientId, false);
        }

        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
            this.typingTimer = null;
        }
    }

    /**
     * 대화방 참가
     */
    joinConversation(conversationId) {
        if (!this.socket || !this.socket.connected) return;

        // 이전 대화방 나가기
        if (this.currentConversationId && this.currentConversationId !== conversationId) {
            this.leaveConversation(this.currentConversationId);
        }

        this.currentConversationId = conversationId;
        this.socket.emit('consultation:joinConversation', { conversationId });
    }

    /**
     * 대화방 나가기
     */
    leaveConversation(conversationId) {
        if (!this.socket || !this.socket.connected) return;

        this.socket.emit('consultation:leaveConversation', { conversationId });

        if (this.currentConversationId === conversationId) {
            this.currentConversationId = null;
        }
    }

    /**
     * 메시지 읽음 처리
     */
    markMessagesAsRead(messageIds) {
        if (!this.socket || !this.socket.connected) return;

        this.socket.emit('consultation:markAsRead', {
            conversationId: this.currentConversationId,
            messageIds
        });
    }

    /**
     * UI 업데이트 함수들
     */

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        if (statusElement) {
            statusElement.className = `connection-status ${status}`;
            statusElement.textContent = status === 'connected' ? '연결됨' : '연결 끊김';
        }
    }

    appendMessage(messageData) {
        const messagesContainer = document.getElementById('chatMessages');
        if (!messagesContainer) return;

        const messageElement = this.createMessageElement(messageData);
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    createMessageElement(messageData) {
        const div = document.createElement('div');
        div.className = `message ${messageData.type}`;
        div.dataset.messageId = messageData.id;

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        bubble.textContent = messageData.message_content;

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date(messageData.sent_at).toLocaleTimeString('ko-KR', {
            hour: '2-digit',
            minute: '2-digit'
        });

        div.appendChild(bubble);
        div.appendChild(time);

        if (messageData.status === 'sending') {
            div.classList.add('sending');
        }

        return div;
    }

    removeMessage(messageId) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }
    }

    markMessageAsRead(messageId, readAt) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.classList.add('read');
            // 읽음 표시 추가
            const readIndicator = document.createElement('span');
            readIndicator.className = 'read-indicator';
            readIndicator.textContent = '읽음';
            messageElement.appendChild(readIndicator);
        }
    }

    showTypingIndicator(userName) {
        let indicator = document.getElementById('typingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'typingIndicator';
            indicator.className = 'typing-indicator';

            const messagesContainer = document.getElementById('chatMessages');
            if (messagesContainer) {
                messagesContainer.appendChild(indicator);
            }
        }

        indicator.textContent = `${userName}님이 입력중...`;
        indicator.style.display = 'block';
    }

    hideTypingIndicator(userName) {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    showSendingIndicator() {
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.disabled = true;
            sendButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        }
    }

    removeSendingIndicator() {
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }

        // 전송 중 메시지 상태 업데이트
        document.querySelectorAll('.message.sending').forEach(element => {
            element.classList.remove('sending');
        });
    }

    updateUserStatus(userId, status) {
        const statusDot = document.querySelector(`[data-user-id="${userId}"] .status-dot`);
        if (statusDot) {
            statusDot.className = `status-dot ${status}`;
        }
    }

    updateUnreadBadge(conversationId) {
        const badge = document.querySelector(`[data-conversation-id="${conversationId}"] .unread-badge`);
        if (badge) {
            const count = this.unreadCounts.get(conversationId) || 0;
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    updateConversationList(conversationId, lastMessage, timestamp) {
        const conversationItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (conversationItem) {
            // 마지막 메시지 업데이트
            const lastMessageElement = conversationItem.querySelector('.conversation-last-message');
            if (lastMessageElement) {
                lastMessageElement.textContent = lastMessage;
            }

            // 시간 업데이트
            const timeElement = conversationItem.querySelector('.conversation-time');
            if (timeElement) {
                timeElement.textContent = this.formatRelativeTime(timestamp);
            }

            // 목록 상단으로 이동
            const parentList = conversationItem.parentElement;
            parentList.insertBefore(conversationItem, parentList.firstChild);
        }
    }

    updateLastMessageTime(timestamp) {
        const timeElements = document.querySelectorAll('.message:last-child .message-time');
        const lastTimeElement = timeElements[timeElements.length - 1];
        if (lastTimeElement) {
            lastTimeElement.textContent = new Date(timestamp).toLocaleTimeString('ko-KR', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    showNotification(data) {
        // 브라우저 알림 권한 확인
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(data.title, {
                body: data.body,
                icon: '/image/logo.png',
                tag: data.conversationId,
                requireInteraction: false
            });

            notification.onclick = () => {
                window.focus();
                // 해당 대화로 이동
                window.location.href = `/consultation/messages?conversation=${data.conversationId}`;
                notification.close();
            };

            // 5초 후 자동 닫기
            setTimeout(() => notification.close(), 5000);
        }

        // 페이지 내 알림도 표시
        this.showInAppNotification(data);
    }

    showInAppNotification(data) {
        const container = document.getElementById('notificationContainer') || this.createNotificationContainer();

        const notification = document.createElement('div');
        notification.className = 'in-app-notification slide-in';
        notification.innerHTML = `
            <div class="notification-header">
                <strong>${data.title}</strong>
                <button class="close-btn">&times;</button>
            </div>
            <div class="notification-body">${data.body}</div>
        `;

        container.appendChild(notification);

        // 클릭 이벤트
        notification.querySelector('.close-btn').addEventListener('click', () => {
            notification.classList.add('slide-out');
            setTimeout(() => notification.remove(), 300);
        });

        // 5초 후 자동 제거
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.add('slide-out');
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    createNotificationContainer() {
        const container = document.createElement('div');
        container.id = 'notificationContainer';
        container.className = 'notification-container';
        document.body.appendChild(container);
        return container;
    }

    showError(message) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger';
        alert.textContent = message;

        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alert, container.firstChild);
            setTimeout(() => alert.remove(), 5000);
        }
    }

    showSystemAlert(type, message) {
        const alertClass = type === 'error' ? 'alert-danger' :
                          type === 'warning' ? 'alert-warning' :
                          'alert-info';

        const alert = document.createElement('div');
        alert.className = `alert ${alertClass}`;
        alert.innerHTML = `
            <i class="fas fa-exclamation-circle"></i> ${message}
            <button class="close-btn">&times;</button>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.insertBefore(alert, container.firstChild);

            alert.querySelector('.close-btn').addEventListener('click', () => {
                alert.remove();
            });

            setTimeout(() => alert.remove(), 10000);
        }
    }

    formatRelativeTime(timestamp) {
        const now = new Date();
        const date = new Date(timestamp);
        const diff = now - date;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}일 전`;
        } else if (hours > 0) {
            return `${hours}시간 전`;
        } else if (minutes > 0) {
            return `${minutes}분 전`;
        } else {
            return '방금 전';
        }
    }

    /**
     * 브라우저 알림 권한 요청
     */
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    console.log('알림 권한이 허용되었습니다.');
                }
            });
        }
    }

    /**
     * 정리 및 연결 해제
     */
    destroy() {
        if (this.currentConversationId) {
            this.leaveConversation(this.currentConversationId);
        }

        if (this.typingTimer) {
            clearTimeout(this.typingTimer);
        }

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        this.unreadCounts.clear();
        this.onlineUsers.clear();
    }
}

// 전역 인스턴스 생성 및 초기화
const realtimeMessaging = new RealtimeMessaging();

// DOM 로드 완료 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    realtimeMessaging.initialize();
    realtimeMessaging.requestNotificationPermission();

    // 현재 사용자 ID 설정 (세션에서 가져오기)
    fetch('/api/auth/me')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.user) {
                realtimeMessaging.currentUserId = data.user.id;
            }
        });
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    realtimeMessaging.destroy();
});