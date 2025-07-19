"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FCMService = void 0;
const firebase_admin_1 = require("firebase-admin");
const firebase_admin_2 = require("firebase-admin");
class FCMService {
    /**
     * FCM 토큰 저장
     */
    static async saveToken(userId, token, platform) {
        try {
            const tokenDoc = {
                userId,
                token,
                platform,
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
            };
            await (0, firebase_admin_2.firestore)()
                .collection('fcm_tokens')
                .doc(token)
                .set(tokenDoc);
            console.log(`FCM 토큰 저장 완료: ${userId} - ${platform}`);
        }
        catch (error) {
            console.error('FCM 토큰 저장 오류:', error);
            throw error;
        }
    }
    /**
     * FCM 토큰 삭제
     */
    static async deleteToken(token) {
        try {
            await (0, firebase_admin_2.firestore)()
                .collection('fcm_tokens')
                .doc(token)
                .delete();
            console.log(`FCM 토큰 삭제 완료: ${token}`);
        }
        catch (error) {
            console.error('FCM 토큰 삭제 오류:', error);
            throw error;
        }
    }
    /**
     * 사용자의 활성 FCM 토큰 조회
     */
    static async getUserTokens(userId) {
        try {
            const snapshot = await (0, firebase_admin_2.firestore)()
                .collection('fcm_tokens')
                .where('userId', '==', userId)
                .where('isActive', '==', true)
                .get();
            return snapshot.docs.map(doc => {
                var _a, _b;
                return (Object.assign(Object.assign({}, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = doc.data().updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() }));
            });
        }
        catch (error) {
            console.error('FCM 토큰 조회 오류:', error);
            throw error;
        }
    }
    /**
     * 사용자 알림 설정 조회
     */
    static async getNotificationSettings(userId) {
        var _a, _b;
        try {
            const doc = await (0, firebase_admin_2.firestore)()
                .collection('notification_settings')
                .doc(userId)
                .get();
            if (!doc.exists) {
                return null;
            }
            const data = doc.data();
            return Object.assign(Object.assign({}, data), { createdAt: (_a = data === null || data === void 0 ? void 0 : data.createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), updatedAt: (_b = data === null || data === void 0 ? void 0 : data.updatedAt) === null || _b === void 0 ? void 0 : _b.toDate() });
        }
        catch (error) {
            console.error('알림 설정 조회 오류:', error);
            throw error;
        }
    }
    /**
     * 사용자 알림 설정 저장
     */
    static async saveNotificationSettings(settings) {
        try {
            await (0, firebase_admin_2.firestore)()
                .collection('notification_settings')
                .doc(settings.userId)
                .set(settings);
            console.log(`알림 설정 저장 완료: ${settings.userId}`);
        }
        catch (error) {
            console.error('알림 설정 저장 오류:', error);
            throw error;
        }
    }
    /**
     * 알림 템플릿 조회
     */
    static getNotificationTemplate(type, data) {
        const templates = {
            TASK_CREATED: {
                type: 'TASK_CREATED',
                title: '새 Task가 할당되었습니다',
                body: `"${data.title}" Task가 할당되었습니다.`,
                data: {
                    taskId: data.taskId,
                    teamId: data.teamId,
                    type: 'TASK_CREATED',
                },
                priority: 'normal',
                androidChannelId: 'task_updates',
            },
            TASK_UPDATED: {
                type: 'TASK_UPDATED',
                title: 'Task가 업데이트되었습니다',
                body: `"${data.title}" Task가 업데이트되었습니다.`,
                data: {
                    taskId: data.taskId,
                    teamId: data.teamId,
                    type: 'TASK_UPDATED',
                },
                priority: 'normal',
                androidChannelId: 'task_updates',
            },
            TASK_DUE_SOON: {
                type: 'TASK_DUE_SOON',
                title: '마감일이 임박한 Task가 있습니다',
                body: `"${data.title}" Task의 마감일이 ${data.dueDate}입니다.`,
                data: {
                    taskId: data.taskId,
                    teamId: data.teamId,
                    type: 'TASK_DUE_SOON',
                },
                priority: 'high',
                androidChannelId: 'urgent_notifications',
            },
            TASK_OVERDUE: {
                type: 'TASK_OVERDUE',
                title: '지연된 Task가 있습니다',
                body: `"${data.title}" Task가 마감일을 지났습니다.`,
                data: {
                    taskId: data.taskId,
                    teamId: data.teamId,
                    type: 'TASK_OVERDUE',
                },
                priority: 'high',
                androidChannelId: 'urgent_notifications',
            },
        };
        return templates[type] || {
            type: 'TASK_UPDATED',
            title: '알림',
            body: '새로운 알림이 있습니다.',
            priority: 'normal',
        };
    }
    /**
     * 단일 사용자에게 Push 알림 발송
     */
    static async sendPushNotification(userId, template, customData) {
        try {
            // 사용자 알림 설정 확인
            const settings = await this.getNotificationSettings(userId);
            if (!settings || !settings.pushEnabled) {
                console.log(`사용자 ${userId}의 Push 알림이 비활성화되어 있습니다.`);
                return false;
            }
            // 알림 타입별 설정 확인
            const typeEnabled = settings[template.type.toLowerCase()];
            if (!typeEnabled) {
                console.log(`사용자 ${userId}의 ${template.type} 알림이 비활성화되어 있습니다.`);
                return false;
            }
            // 조용한 시간 확인
            if (settings.quietHours.enabled) {
                const now = new Date();
                const currentTime = now.getHours() * 60 + now.getMinutes();
                const startTime = this.parseTime(settings.quietHours.start);
                const endTime = this.parseTime(settings.quietHours.end);
                if (this.isInQuietHours(currentTime, startTime, endTime)) {
                    console.log(`사용자 ${userId}의 조용한 시간 중입니다.`);
                    return false;
                }
            }
            // 사용자의 FCM 토큰 조회
            const tokens = await this.getUserTokens(userId);
            if (tokens.length === 0) {
                console.log(`사용자 ${userId}의 FCM 토큰이 없습니다.`);
                return false;
            }
            // 각 토큰에 대해 알림 발송
            const results = await Promise.allSettled(tokens.map(token => this.sendToToken(token, template, customData)));
            const successCount = results.filter(result => result.status === 'fulfilled').length;
            console.log(`사용자 ${userId}에게 ${successCount}/${tokens.length}개 토큰으로 알림 발송 완료`);
            return successCount > 0;
        }
        catch (error) {
            console.error('Push 알림 발송 오류:', error);
            return false;
        }
    }
    /**
     * 토큰에 직접 알림 발송
     */
    static async sendToToken(token, template, customData) {
        try {
            const message = {
                token: token.token,
                notification: {
                    title: template.title,
                    body: template.body,
                },
                data: Object.assign(Object.assign({}, template.data), customData),
                android: {
                    priority: template.priority,
                    notification: {
                        channelId: template.androidChannelId || 'default',
                        priority: template.priority === 'high' ? 'high' : 'default',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: template.title,
                                body: template.body,
                            },
                            badge: 1,
                            sound: 'default',
                        },
                    },
                },
                webpush: {
                    notification: {
                        title: template.title,
                        body: template.body,
                        icon: '/icon-192x192.png',
                        badge: '/badge-72x72.png',
                        tag: template.type,
                        data: template.data,
                    },
                    fcmOptions: {
                        link: '/tasks',
                    },
                },
            }; // 타입 캐스팅으로 임시 해결
            const response = await (0, firebase_admin_1.messaging)().send(message);
            console.log(`FCM 메시지 발송 성공: ${response}`);
        }
        catch (error) {
            console.error(`FCM 메시지 발송 실패 (토큰: ${token.token}):`, error);
            throw error;
        }
    }
    /**
     * 시간 파싱 (HH:mm 형식)
     */
    static parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }
    /**
     * 조용한 시간 확인
     */
    static isInQuietHours(currentTime, startTime, endTime) {
        if (startTime <= endTime) {
            // 같은 날 내의 시간 범위
            return currentTime >= startTime && currentTime <= endTime;
        }
        else {
            // 자정을 걸치는 시간 범위
            return currentTime >= startTime || currentTime <= endTime;
        }
    }
    /**
     * 알림 통계 저장
     */
    static async saveNotificationStats(stats) {
        try {
            const statsDoc = Object.assign(Object.assign({}, stats), { timestamp: new Date() });
            await (0, firebase_admin_2.firestore)()
                .collection('notification_stats')
                .add(statsDoc);
            console.log('알림 통계 저장 완료');
        }
        catch (error) {
            console.error('알림 통계 저장 오류:', error);
        }
    }
}
exports.FCMService = FCMService;
//# sourceMappingURL=fcmService.js.map