/**
 * 화상 수업 서비스
 * Vimeo API를 활용한 실시간 화상 수업 및 녹화 관리
 */

const Vimeo = require('@vimeo/vimeo').Vimeo;
const AgoraRTC = require('agora-rtc-sdk-ng');
const { PeerServer } = require('peer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs').promises;
const path = require('path');

class VideoClassService {
    constructor() {
        // Vimeo API 초기화
        this.vimeoClient = new Vimeo(
            process.env.VIMEO_CLIENT_ID || 'your_client_id',
            process.env.VIMEO_CLIENT_SECRET || 'your_client_secret',
            process.env.VIMEO_ACCESS_TOKEN || 'your_access_token'
        );

        // Agora RTC 설정 (실시간 화상통화)
        this.agoraAppId = process.env.AGORA_APP_ID || 'your_agora_app_id';

        // 활성 세션 관리
        this.activeSessions = new Map();

        // 녹화 상태 관리
        this.recordingSessions = new Map();
    }

    /**
     * 화상 수업 세션 생성
     * @param {Object} classData - 수업 정보
     * @returns {Promise<Object>} 생성된 세션 정보
     */
    async createVideoClass(classData) {
        try {
            const {
                academyId,
                classId,
                teacherId,
                studentIds,
                subject,
                scheduledTime,
                duration
            } = classData;

            // 고유 세션 ID 생성
            const sessionId = `class_${academyId}_${classId}_${Date.now()}`;

            // Agora 채널 토큰 생성
            const agoraToken = await this.generateAgoraToken(sessionId, teacherId);

            // Vimeo 라이브 이벤트 생성
            const vimeoLiveEvent = await this.createVimeoLiveEvent({
                title: `${subject} - 화상 수업`,
                description: `학원: ${academyId}, 수업: ${classId}`,
                privacy: 'password', // 비밀번호 보호
                password: this.generateClassPassword(),
                scheduled_time: scheduledTime
            });

            // 세션 정보 저장
            const sessionInfo = {
                sessionId,
                academyId,
                classId,
                teacherId,
                studentIds,
                subject,
                scheduledTime,
                duration,
                status: 'scheduled',
                agoraChannel: sessionId,
                agoraToken,
                vimeoEventId: vimeoLiveEvent.uri,
                vimeoStreamKey: vimeoLiveEvent.stream_key,
                vimeoPlaybackUrl: vimeoLiveEvent.embed.html,
                joinUrl: `/video-class/join/${sessionId}`,
                createdAt: new Date()
            };

            this.activeSessions.set(sessionId, sessionInfo);

            // 데이터베이스에 저장
            await this.saveSessionToDatabase(sessionInfo);

            // 참가자에게 초대 알림 전송
            await this.sendInvitations(sessionInfo);

            return {
                success: true,
                data: sessionInfo
            };
        } catch (error) {
            console.error('화상 수업 생성 오류:', error);
            throw error;
        }
    }

    /**
     * Agora RTC 토큰 생성
     */
    async generateAgoraToken(channelName, uid) {
        // 실제 구현 시 Agora Token Server 사용
        // https://docs.agora.io/en/video-calling/develop/authentication-workflow
        return 'dummy_token_' + channelName + '_' + uid;
    }

    /**
     * Vimeo 라이브 이벤트 생성
     */
    async createVimeoLiveEvent(eventData) {
        return new Promise((resolve, reject) => {
            this.vimeoClient.request({
                method: 'POST',
                path: '/me/live_events',
                query: {
                    title: eventData.title,
                    description: eventData.description,
                    privacy: {
                        view: eventData.privacy,
                        password: eventData.password
                    },
                    scheduled_start_time: eventData.scheduled_time,
                    stream_privacy: {
                        view: 'anybody' // 스트림 접근 권한
                    }
                }
            }, (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * 수업 비밀번호 생성
     */
    generateClassPassword() {
        return Math.random().toString(36).substring(2, 10).toUpperCase();
    }

    /**
     * 화상 수업 시작
     */
    async startVideoClass(sessionId, teacherId) {
        try {
            const session = this.activeSessions.get(sessionId);

            if (!session) {
                throw new Error('세션을 찾을 수 없습니다.');
            }

            if (session.teacherId !== teacherId) {
                throw new Error('권한이 없습니다.');
            }

            // 세션 상태 업데이트
            session.status = 'live';
            session.startedAt = new Date();

            // Vimeo 스트리밍 시작
            await this.startVimeoStreaming(session.vimeoEventId);

            // 녹화 시작 (옵션)
            if (session.recordingEnabled) {
                await this.startRecording(sessionId);
            }

            // 참가자에게 알림
            await this.notifyParticipants(sessionId, 'class_started');

            return {
                success: true,
                message: '화상 수업이 시작되었습니다.',
                streamUrl: session.vimeoPlaybackUrl
            };
        } catch (error) {
            console.error('화상 수업 시작 오류:', error);
            throw error;
        }
    }

    /**
     * Vimeo 스트리밍 시작
     */
    async startVimeoStreaming(eventId) {
        return new Promise((resolve, reject) => {
            this.vimeoClient.request({
                method: 'PATCH',
                path: eventId,
                query: {
                    status: 'streaming'
                }
            }, (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * 화상 수업 참가
     */
    async joinVideoClass(sessionId, userId, userType) {
        try {
            const session = this.activeSessions.get(sessionId);

            if (!session) {
                throw new Error('세션을 찾을 수 없습니다.');
            }

            // 참가 권한 확인
            if (userType === 'student' && !session.studentIds.includes(userId)) {
                throw new Error('이 수업에 참가할 권한이 없습니다.');
            }

            // 참가자 토큰 생성
            const participantToken = await this.generateAgoraToken(sessionId, userId);

            // 참가 정보
            const joinInfo = {
                sessionId,
                agoraAppId: this.agoraAppId,
                channel: session.agoraChannel,
                token: participantToken,
                uid: userId,
                role: userType === 'teacher' ? 'host' : 'audience',
                streamUrl: session.vimeoPlaybackUrl,
                chatEnabled: true,
                screenShareEnabled: userType === 'teacher',
                recordingEnabled: session.recordingEnabled
            };

            // 참가자 목록 업데이트
            if (!session.participants) {
                session.participants = [];
            }
            session.participants.push({
                userId,
                userType,
                joinedAt: new Date()
            });

            return {
                success: true,
                data: joinInfo
            };
        } catch (error) {
            console.error('화상 수업 참가 오류:', error);
            throw error;
        }
    }

    /**
     * 화면 공유 시작
     */
    async startScreenShare(sessionId, userId) {
        try {
            const session = this.activeSessions.get(sessionId);

            if (!session) {
                throw new Error('세션을 찾을 수 없습니다.');
            }

            // 화면 공유 스트림 ID 생성
            const screenStreamId = `screen_${userId}_${Date.now()}`;

            // 화면 공유 정보 저장
            session.screenShare = {
                userId,
                streamId: screenStreamId,
                startedAt: new Date()
            };

            // 다른 참가자에게 알림
            await this.broadcastToParticipants(sessionId, 'screen_share_started', {
                userId,
                streamId: screenStreamId
            });

            return {
                success: true,
                streamId: screenStreamId
            };
        } catch (error) {
            console.error('화면 공유 오류:', error);
            throw error;
        }
    }

    /**
     * 수업 녹화 시작
     */
    async startRecording(sessionId) {
        try {
            const session = this.activeSessions.get(sessionId);

            if (!session) {
                throw new Error('세션을 찾을 수 없습니다.');
            }

            // Vimeo 자동 녹화 활성화
            const recording = await this.enableVimeoRecording(session.vimeoEventId);

            // 녹화 정보 저장
            const recordingInfo = {
                sessionId,
                vimeoVideoId: recording.video_id,
                startedAt: new Date(),
                status: 'recording'
            };

            this.recordingSessions.set(sessionId, recordingInfo);

            return {
                success: true,
                message: '녹화가 시작되었습니다.',
                recordingId: recording.video_id
            };
        } catch (error) {
            console.error('녹화 시작 오류:', error);
            throw error;
        }
    }

    /**
     * Vimeo 녹화 활성화
     */
    async enableVimeoRecording(eventId) {
        return new Promise((resolve, reject) => {
            this.vimeoClient.request({
                method: 'POST',
                path: `${eventId}/auto_recording`
            }, (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * 수업 녹화 중지
     */
    async stopRecording(sessionId) {
        try {
            const recordingInfo = this.recordingSessions.get(sessionId);

            if (!recordingInfo) {
                throw new Error('녹화 정보를 찾을 수 없습니다.');
            }

            // Vimeo 녹화 중지
            await this.stopVimeoRecording(recordingInfo.vimeoVideoId);

            // 녹화 정보 업데이트
            recordingInfo.status = 'completed';
            recordingInfo.endedAt = new Date();

            // 녹화 파일 처리
            const processedVideo = await this.processRecording(recordingInfo);

            return {
                success: true,
                message: '녹화가 완료되었습니다.',
                videoUrl: processedVideo.url
            };
        } catch (error) {
            console.error('녹화 중지 오류:', error);
            throw error;
        }
    }

    /**
     * Vimeo 녹화 중지
     */
    async stopVimeoRecording(videoId) {
        return new Promise((resolve, reject) => {
            this.vimeoClient.request({
                method: 'PATCH',
                path: `/videos/${videoId}`,
                query: {
                    privacy: {
                        view: 'unlisted' // 비공개로 설정
                    }
                }
            }, (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * 녹화 파일 처리
     */
    async processRecording(recordingInfo) {
        try {
            // Vimeo에서 비디오 정보 가져오기
            const videoInfo = await this.getVimeoVideo(recordingInfo.vimeoVideoId);

            // 썸네일 생성
            const thumbnail = await this.generateThumbnail(videoInfo.link);

            // 데이터베이스에 저장
            const savedRecording = await this.saveRecordingToDatabase({
                sessionId: recordingInfo.sessionId,
                vimeoVideoId: recordingInfo.vimeoVideoId,
                url: videoInfo.link,
                embedUrl: videoInfo.embed.html,
                thumbnail: thumbnail,
                duration: videoInfo.duration,
                fileSize: videoInfo.files[0]?.size || 0,
                createdAt: recordingInfo.startedAt,
                completedAt: recordingInfo.endedAt
            });

            return savedRecording;
        } catch (error) {
            console.error('녹화 처리 오류:', error);
            throw error;
        }
    }

    /**
     * Vimeo 비디오 정보 조회
     */
    async getVimeoVideo(videoId) {
        return new Promise((resolve, reject) => {
            this.vimeoClient.request({
                method: 'GET',
                path: `/videos/${videoId}`
            }, (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * 썸네일 생성
     */
    async generateThumbnail(videoUrl) {
        const thumbnailPath = path.join(__dirname, '../../uploads/thumbnails', `thumb_${Date.now()}.jpg`);

        return new Promise((resolve, reject) => {
            ffmpeg(videoUrl)
                .screenshots({
                    timestamps: ['10%'],
                    filename: path.basename(thumbnailPath),
                    folder: path.dirname(thumbnailPath),
                    size: '320x240'
                })
                .on('end', () => {
                    resolve(thumbnailPath);
                })
                .on('error', (err) => {
                    console.error('썸네일 생성 오류:', err);
                    resolve(null); // 실패해도 계속 진행
                });
        });
    }

    /**
     * 화상 수업 종료
     */
    async endVideoClass(sessionId, teacherId) {
        try {
            const session = this.activeSessions.get(sessionId);

            if (!session) {
                throw new Error('세션을 찾을 수 없습니다.');
            }

            if (session.teacherId !== teacherId) {
                throw new Error('권한이 없습니다.');
            }

            // 녹화 중지
            if (this.recordingSessions.has(sessionId)) {
                await this.stopRecording(sessionId);
            }

            // Vimeo 스트리밍 종료
            await this.endVimeoStreaming(session.vimeoEventId);

            // 세션 상태 업데이트
            session.status = 'ended';
            session.endedAt = new Date();

            // 수업 통계 생성
            const statistics = await this.generateClassStatistics(session);

            // 참가자에게 종료 알림
            await this.notifyParticipants(sessionId, 'class_ended', {
                duration: session.endedAt - session.startedAt,
                recordingAvailable: this.recordingSessions.has(sessionId)
            });

            // 세션 정리
            this.activeSessions.delete(sessionId);

            return {
                success: true,
                message: '화상 수업이 종료되었습니다.',
                statistics
            };
        } catch (error) {
            console.error('화상 수업 종료 오류:', error);
            throw error;
        }
    }

    /**
     * Vimeo 스트리밍 종료
     */
    async endVimeoStreaming(eventId) {
        return new Promise((resolve, reject) => {
            this.vimeoClient.request({
                method: 'PATCH',
                path: eventId,
                query: {
                    status: 'ended'
                }
            }, (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    /**
     * 수업 통계 생성
     */
    async generateClassStatistics(session) {
        const duration = session.endedAt - session.startedAt;
        const durationMinutes = Math.floor(duration / 60000);

        return {
            sessionId: session.sessionId,
            subject: session.subject,
            teacher: session.teacherId,
            totalParticipants: session.participants?.length || 0,
            duration: durationMinutes,
            startTime: session.startedAt,
            endTime: session.endedAt,
            recordingAvailable: this.recordingSessions.has(session.sessionId),
            participantDetails: session.participants?.map(p => ({
                userId: p.userId,
                joinTime: p.joinedAt,
                duration: session.endedAt - p.joinedAt
            }))
        };
    }

    /**
     * 녹화된 수업 목록 조회
     */
    async getRecordedClasses(academyId, filters = {}) {
        try {
            // 데이터베이스에서 녹화 목록 조회
            const recordings = await this.getRecordingsFromDatabase(academyId, filters);

            // Vimeo 정보 업데이트
            const enrichedRecordings = await Promise.all(
                recordings.map(async (recording) => {
                    try {
                        const vimeoInfo = await this.getVimeoVideo(recording.vimeoVideoId);
                        return {
                            ...recording,
                            views: vimeoInfo.stats?.plays || 0,
                            thumbnail: vimeoInfo.pictures?.sizes?.[0]?.link || recording.thumbnail
                        };
                    } catch (error) {
                        console.error('Vimeo 정보 조회 실패:', error);
                        return recording;
                    }
                })
            );

            return {
                success: true,
                data: enrichedRecordings
            };
        } catch (error) {
            console.error('녹화 목록 조회 오류:', error);
            throw error;
        }
    }

    /**
     * 녹화된 수업 재생
     */
    async playRecording(recordingId, userId) {
        try {
            // 녹화 정보 조회
            const recording = await this.getRecordingById(recordingId);

            if (!recording) {
                throw new Error('녹화를 찾을 수 없습니다.');
            }

            // 접근 권한 확인
            const hasAccess = await this.checkRecordingAccess(recording, userId);

            if (!hasAccess) {
                throw new Error('이 녹화에 접근할 권한이 없습니다.');
            }

            // 재생 URL 생성 (임시 토큰 포함)
            const playbackUrl = await this.generateSecurePlaybackUrl(recording.vimeoVideoId);

            // 시청 기록 저장
            await this.saveViewingHistory({
                userId,
                recordingId,
                startedAt: new Date()
            });

            return {
                success: true,
                data: {
                    url: playbackUrl,
                    embedUrl: recording.embedUrl,
                    duration: recording.duration,
                    title: recording.title
                }
            };
        } catch (error) {
            console.error('녹화 재생 오류:', error);
            throw error;
        }
    }

    /**
     * 보안 재생 URL 생성
     */
    async generateSecurePlaybackUrl(videoId) {
        return new Promise((resolve, reject) => {
            this.vimeoClient.request({
                method: 'GET',
                path: `/videos/${videoId}`,
                query: {
                    fields: 'play'
                }
            }, (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    // 가장 높은 품질의 재생 URL 선택
                    const playUrl = body.play?.progressive?.[0]?.link || body.link;
                    resolve(playUrl);
                }
            });
        });
    }

    /**
     * 실시간 채팅
     */
    async sendChatMessage(sessionId, userId, message) {
        try {
            const session = this.activeSessions.get(sessionId);

            if (!session) {
                throw new Error('세션을 찾을 수 없습니다.');
            }

            const chatMessage = {
                userId,
                message,
                timestamp: new Date()
            };

            // 채팅 메시지 저장
            if (!session.chatMessages) {
                session.chatMessages = [];
            }
            session.chatMessages.push(chatMessage);

            // WebSocket을 통해 모든 참가자에게 전송
            await this.broadcastToParticipants(sessionId, 'chat_message', chatMessage);

            return {
                success: true
            };
        } catch (error) {
            console.error('채팅 전송 오류:', error);
            throw error;
        }
    }

    /**
     * 참가자에게 브로드캐스트
     */
    async broadcastToParticipants(sessionId, eventType, data) {
        const session = this.activeSessions.get(sessionId);
        if (session && session.participants) {
            // WebSocket 서비스를 통해 전송
            const webSocketServer = require('../config/websocket');
            session.participants.forEach(participant => {
                webSocketServer.sendNotificationToUser(participant.userId, eventType, {
                    sessionId,
                    ...data
                });
            });
        }
    }

    /**
     * 초대 알림 전송
     */
    async sendInvitations(sessionInfo) {
        const { teacherId, studentIds, subject, scheduledTime, joinUrl } = sessionInfo;

        // 교사 초대
        await this.sendNotification(teacherId, {
            type: 'video_class_invitation',
            title: `화상 수업 예정: ${subject}`,
            message: `${scheduledTime}에 화상 수업이 예정되어 있습니다.`,
            joinUrl
        });

        // 학생들 초대
        for (const studentId of studentIds) {
            await this.sendNotification(studentId, {
                type: 'video_class_invitation',
                title: `화상 수업 초대: ${subject}`,
                message: `${scheduledTime}에 화상 수업이 있습니다.`,
                joinUrl
            });
        }
    }

    /**
     * 알림 전송
     */
    async sendNotification(userId, notification) {
        // 실제 구현 시 알림 서비스 사용
        console.log(`Notification to ${userId}:`, notification);
    }

    /**
     * 참가자 알림
     */
    async notifyParticipants(sessionId, eventType, data) {
        await this.broadcastToParticipants(sessionId, 'notification', {
            type: eventType,
            ...data
        });
    }

    /**
     * 데이터베이스 저장 메서드들 (실제 구현 필요)
     */
    async saveSessionToDatabase(sessionInfo) {
        // TODO: 실제 데이터베이스 저장 로직
        console.log('Session saved to database:', sessionInfo.sessionId);
    }

    async saveRecordingToDatabase(recordingInfo) {
        // TODO: 실제 데이터베이스 저장 로직
        console.log('Recording saved to database:', recordingInfo);
        return recordingInfo;
    }

    async getRecordingsFromDatabase(academyId, filters) {
        // TODO: 실제 데이터베이스 조회 로직
        return [];
    }

    async getRecordingById(recordingId) {
        // TODO: 실제 데이터베이스 조회 로직
        return null;
    }

    async checkRecordingAccess(recording, userId) {
        // TODO: 실제 권한 확인 로직
        return true;
    }

    async saveViewingHistory(viewingInfo) {
        // TODO: 실제 시청 기록 저장 로직
        console.log('Viewing history saved:', viewingInfo);
    }
}

module.exports = new VideoClassService();