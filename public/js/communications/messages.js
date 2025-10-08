// 메시징 페이지 JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // WebSocket 연결
    let socket = null;
    let currentConversationId = null;
    let currentUserId = null;
    let typingTimer = null;
    let isTyping = false;

    // DOM 요소
    const conversationsList = document.getElementById('conversationsList');
    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessage');
    const attachmentInput = document.getElementById('attachmentInput');
    const attachmentButton = document.getElementById('attachmentButton');
    const searchInput = document.getElementById('searchConversations');
    const newConversationBtn = document.getElementById('newConversation');
    const typingIndicator = document.getElementById('typingIndicator');
    const onlineStatus = document.getElementById('onlineStatus');

    // 초기화
    init();

    function init() {
        setupWebSocket();
        loadConversations();
        setupEventListeners();
        getUserInfo();
    }

    // 사용자 정보 가져오기
    async function getUserInfo() {
        try {
            const response = await fetch('/api/auth/me');
            const data = await response.json();
            currentUserId = data.user.id;
        } catch (error) {
            console.error('사용자 정보 조회 실패:', error);
        }
    }

    // WebSocket 설정
    function setupWebSocket() {
        // 기존 Socket.io 연결이 있다면 재사용
        if (window.io && typeof window.io === 'function') {
            socket = window.io();

            // WebSocket 이벤트 리스너
            socket.on('connect', () => {
                console.log('WebSocket 연결됨');
                updateOnlineStatus(true);
            });

            socket.on('disconnect', () => {
                console.log('WebSocket 연결 끊김');
                updateOnlineStatus(false);
            });

            // 새 메시지 수신
            socket.on('new-message', (data) => {
                handleNewMessage(data);
            });

            // 메시지 읽음 처리
            socket.on('message-read', (data) => {
                handleMessageRead(data);
            });

            // 입력 중 표시
            socket.on('user-typing', (data) => {
                handleUserTyping(data);
            });

            // 사용자 온라인 상태
            socket.on('user-online', (userId) => {
                updateUserOnlineStatus(userId, true);
            });

            socket.on('user-offline', (userId) => {
                updateUserOnlineStatus(userId, false);
            });
        }
    }

    // 이벤트 리스너 설정
    function setupEventListeners() {
        // 메시지 전송
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // 입력 중 감지
        messageInput.addEventListener('input', handleTypingIndicator);

        // 파일 첨부
        attachmentButton.addEventListener('click', () => {
            attachmentInput.click();
        });

        attachmentInput.addEventListener('change', handleFileAttachment);

        // 대화 검색
        searchInput.addEventListener('input', debounce(searchConversations, 300));

        // 새 대화 시작
        newConversationBtn.addEventListener('click', startNewConversation);

        // 메시지 컨테이너 스크롤 이벤트 (이전 메시지 로드)
        messagesContainer.addEventListener('scroll', () => {
            if (messagesContainer.scrollTop === 0) {
                loadMoreMessages();
            }
        });

        // 이미지 클릭 시 확대
        messagesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('message-image')) {
                showImageModal(e.target.src);
            }
        });
    }

    // 대화 목록 불러오기
    async function loadConversations() {
        try {
            const response = await fetch('/api/communications/conversations');
            const conversations = await response.json();

            renderConversations(conversations);
        } catch (error) {
            console.error('대화 목록 조회 실패:', error);
            showToast('대화 목록을 불러오는데 실패했습니다.', 'error');
        }
    }

    // 대화 목록 렌더링
    function renderConversations(conversations) {
        conversationsList.innerHTML = '';

        conversations.forEach(conversation => {
            const item = document.createElement('div');
            item.className = 'conversation-item';
            item.dataset.conversationId = conversation.id;

            const unreadBadge = conversation.unread_count > 0
                ? `<span class="unread-badge">${conversation.unread_count}</span>`
                : '';

            const onlineIndicator = conversation.is_online
                ? '<span class="online-indicator"></span>'
                : '';

            item.innerHTML = `
                <div class="conversation-avatar">
                    <div class="avatar-circle">${conversation.participant_name[0]}</div>
                    ${onlineIndicator}
                </div>
                <div class="conversation-info">
                    <div class="conversation-header">
                        <span class="conversation-name">${conversation.participant_name}</span>
                        <span class="conversation-time">${formatTime(conversation.last_message_time)}</span>
                    </div>
                    <div class="conversation-preview">
                        ${conversation.last_message || '대화를 시작하세요'}
                    </div>
                </div>
                ${unreadBadge}
            `;

            item.addEventListener('click', () => selectConversation(conversation.id));
            conversationsList.appendChild(item);
        });
    }

    // 대화 선택
    async function selectConversation(conversationId) {
        currentConversationId = conversationId;

        // 활성 대화 표시
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-conversation-id="${conversationId}"]`)?.classList.add('active');

        // 메시지 로드
        await loadMessages(conversationId);

        // 읽음 처리
        markMessagesAsRead(conversationId);

        // WebSocket 룸 참여
        if (socket) {
            socket.emit('join-conversation', conversationId);
        }
    }

    // 메시지 불러오기
    async function loadMessages(conversationId, before = null) {
        try {
            let url = `/api/communications/conversations/${conversationId}/messages`;
            if (before) {
                url += `?before=${before}`;
            }

            const response = await fetch(url);
            const messages = await response.json();

            if (before) {
                prependMessages(messages);
            } else {
                renderMessages(messages);
            }
        } catch (error) {
            console.error('메시지 조회 실패:', error);
        }
    }

    // 메시지 렌더링
    function renderMessages(messages) {
        messagesContainer.innerHTML = '';

        messages.forEach(message => {
            appendMessage(message);
        });

        // 스크롤 최하단으로
        scrollToBottom();
    }

    // 메시지 추가
    function appendMessage(message) {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    }

    // 메시지 요소 생성
    function createMessageElement(message) {
        const div = document.createElement('div');
        div.className = `message ${message.sender_id === currentUserId ? 'sent' : 'received'}`;
        div.dataset.messageId = message.id;

        let content = '';

        // 메시지 타입별 렌더링
        switch (message.type) {
            case 'text':
                content = `<div class="message-text">${escapeHtml(message.content)}</div>`;
                break;
            case 'image':
                content = `
                    <img src="${message.attachment_url}" class="message-image" alt="이미지">
                    ${message.content ? `<div class="message-text">${escapeHtml(message.content)}</div>` : ''}
                `;
                break;
            case 'file':
                content = `
                    <div class="message-file">
                        <i class="fas fa-file"></i>
                        <a href="${message.attachment_url}" download="${message.attachment_name}">
                            ${message.attachment_name}
                        </a>
                        <span class="file-size">${formatFileSize(message.attachment_size)}</span>
                    </div>
                    ${message.content ? `<div class="message-text">${escapeHtml(message.content)}</div>` : ''}
                `;
                break;
            case 'video':
                content = `
                    <video src="${message.attachment_url}" controls class="message-video"></video>
                    ${message.content ? `<div class="message-text">${escapeHtml(message.content)}</div>` : ''}
                `;
                break;
        }

        // 읽음 상태
        const readStatus = message.is_read
            ? '<i class="fas fa-check-double read-status"></i>'
            : '<i class="fas fa-check"></i>';

        div.innerHTML = `
            <div class="message-bubble">
                ${content}
                <div class="message-meta">
                    <span class="message-time">${formatTime(message.sent_at)}</span>
                    ${message.sender_id === currentUserId ? readStatus : ''}
                </div>
            </div>
        `;

        return div;
    }

    // 메시지 전송
    async function sendMessage() {
        const content = messageInput.value.trim();
        if (!content && !attachmentInput.files.length) return;

        const formData = new FormData();
        formData.append('conversation_id', currentConversationId);
        formData.append('content', content);

        // 파일 첨부가 있는 경우
        if (attachmentInput.files.length > 0) {
            formData.append('attachment', attachmentInput.files[0]);
        }

        try {
            const response = await fetch('/api/communications/messages', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const message = await response.json();

                // WebSocket으로 실시간 전송
                if (socket) {
                    socket.emit('send-message', {
                        conversationId: currentConversationId,
                        message: message
                    });
                }

                // 입력창 초기화
                messageInput.value = '';
                attachmentInput.value = '';

                // 메시지 화면에 추가
                appendMessage(message);
                scrollToBottom();

                // 대화 목록 업데이트
                updateConversationPreview(currentConversationId, content);
            }
        } catch (error) {
            console.error('메시지 전송 실패:', error);
            showToast('메시지 전송에 실패했습니다.', 'error');
        }
    }

    // 파일 첨부 처리
    async function handleFileAttachment(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 파일 크기 체크 (10MB)
        if (file.size > 10 * 1024 * 1024) {
            showToast('파일 크기는 10MB를 초과할 수 없습니다.', 'error');
            e.target.value = '';
            return;
        }

        // 파일 타입에 따른 미리보기
        if (file.type.startsWith('image/')) {
            showImagePreview(file);
        } else {
            showFilePreview(file);
        }
    }

    // 입력 중 표시 처리
    function handleTypingIndicator() {
        if (!socket || !currentConversationId) return;

        if (!isTyping) {
            isTyping = true;
            socket.emit('typing', {
                conversationId: currentConversationId,
                userId: currentUserId
            });
        }

        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            isTyping = false;
            socket.emit('stop-typing', {
                conversationId: currentConversationId,
                userId: currentUserId
            });
        }, 1000);
    }

    // 새 메시지 수신 처리
    function handleNewMessage(data) {
        if (data.conversationId === currentConversationId) {
            appendMessage(data.message);
            scrollToBottom();

            // 읽음 처리
            markMessagesAsRead(currentConversationId);
        } else {
            // 다른 대화의 메시지인 경우 알림 표시
            showNotification(data.message);
            updateUnreadCount(data.conversationId);
        }

        // 대화 목록 업데이트
        updateConversationPreview(data.conversationId, data.message.content);
    }

    // 메시지 읽음 처리
    function markMessagesAsRead(conversationId) {
        if (!socket) return;

        socket.emit('read-messages', {
            conversationId: conversationId
        });

        // UI 업데이트
        document.querySelectorAll('.message.received:not(.read)').forEach(msg => {
            msg.classList.add('read');
        });
    }

    // 사용자 입력 중 표시
    function handleUserTyping(data) {
        if (data.conversationId !== currentConversationId) return;

        typingIndicator.style.display = 'block';
        typingIndicator.textContent = '상대방이 입력 중입니다...';

        setTimeout(() => {
            typingIndicator.style.display = 'none';
        }, 3000);
    }

    // 새 대화 시작
    async function startNewConversation() {
        // 사용자 선택 모달 표시
        const modal = document.getElementById('newConversationModal');
        modal.style.display = 'block';

        // 사용자 목록 로드
        try {
            const response = await fetch('/api/users/available-for-chat');
            const users = await response.json();

            const userList = document.getElementById('userList');
            userList.innerHTML = '';

            users.forEach(user => {
                const item = document.createElement('div');
                item.className = 'user-item';
                item.innerHTML = `
                    <span>${user.name}</span>
                    <button class="btn-sm" onclick="createConversation(${user.id})">
                        대화 시작
                    </button>
                `;
                userList.appendChild(item);
            });
        } catch (error) {
            console.error('사용자 목록 조회 실패:', error);
        }
    }

    // 대화 생성
    window.createConversation = async function(participantId) {
        try {
            const response = await fetch('/api/communications/conversations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    participant_id: participantId,
                    type: 'direct'
                })
            });

            if (response.ok) {
                const conversation = await response.json();

                // 모달 닫기
                document.getElementById('newConversationModal').style.display = 'none';

                // 대화 목록 새로고침
                await loadConversations();

                // 새 대화 선택
                selectConversation(conversation.id);
            }
        } catch (error) {
            console.error('대화 생성 실패:', error);
            showToast('대화 생성에 실패했습니다.', 'error');
        }
    };

    // 대화 검색
    async function searchConversations() {
        const query = searchInput.value.trim();

        if (!query) {
            loadConversations();
            return;
        }

        try {
            const response = await fetch(`/api/communications/conversations/search?q=${encodeURIComponent(query)}`);
            const conversations = await response.json();
            renderConversations(conversations);
        } catch (error) {
            console.error('대화 검색 실패:', error);
        }
    }

    // 이전 메시지 더 불러오기
    async function loadMoreMessages() {
        const firstMessage = messagesContainer.querySelector('.message');
        if (!firstMessage) return;

        const oldScrollHeight = messagesContainer.scrollHeight;
        await loadMessages(currentConversationId, firstMessage.dataset.messageId);

        // 스크롤 위치 유지
        messagesContainer.scrollTop = messagesContainer.scrollHeight - oldScrollHeight;
    }

    // 이미지 모달 표시
    function showImageModal(src) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close-modal">&times;</span>
                <img src="${src}" alt="이미지">
            </div>
        `;

        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        document.body.appendChild(modal);
    }

    // 알림 표시
    function showNotification(message) {
        // 브라우저 알림 권한 확인
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('새 메시지', {
                body: message.content,
                icon: '/images/logo.png'
            });
        }

        // 토스트 알림
        showToast('새 메시지가 도착했습니다.', 'info');
    }

    // 헬퍼 함수들
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return '방금 전';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}일 전`;

        return date.toLocaleDateString('ko-KR');
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    function updateOnlineStatus(isOnline) {
        if (onlineStatus) {
            onlineStatus.className = isOnline ? 'online' : 'offline';
            onlineStatus.textContent = isOnline ? '온라인' : '오프라인';
        }
    }

    function updateUserOnlineStatus(userId, isOnline) {
        // 대화 목록에서 해당 사용자의 온라인 상태 업데이트
        const conversations = document.querySelectorAll('.conversation-item');
        conversations.forEach(item => {
            // 실제 구현 시 conversation의 participant_id와 비교
            const indicator = item.querySelector('.online-indicator');
            if (indicator) {
                indicator.style.display = isOnline ? 'block' : 'none';
            }
        });
    }

    function updateConversationPreview(conversationId, lastMessage) {
        const item = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (item) {
            const preview = item.querySelector('.conversation-preview');
            if (preview) {
                preview.textContent = lastMessage;
            }
            const time = item.querySelector('.conversation-time');
            if (time) {
                time.textContent = '방금 전';
            }
        }
    }

    function updateUnreadCount(conversationId) {
        const item = document.querySelector(`[data-conversation-id="${conversationId}"]`);
        if (item) {
            let badge = item.querySelector('.unread-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge';
                item.appendChild(badge);
            }
            const currentCount = parseInt(badge.textContent || '0');
            badge.textContent = currentCount + 1;
        }
    }

    // 브라우저 알림 권한 요청
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});