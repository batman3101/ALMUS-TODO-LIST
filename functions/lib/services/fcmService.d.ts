import { FCMToken, NotificationSettings, NotificationTemplate } from '../types/fcm';
export declare class FCMService {
    /**
     * FCM 토큰 저장
     */
    static saveToken(userId: string, token: string, platform: 'web' | 'ios' | 'android'): Promise<void>;
    /**
     * FCM 토큰 삭제
     */
    static deleteToken(token: string): Promise<void>;
    /**
     * 사용자의 활성 FCM 토큰 조회
     */
    static getUserTokens(userId: string): Promise<FCMToken[]>;
    /**
     * 사용자 알림 설정 조회
     */
    static getNotificationSettings(userId: string): Promise<NotificationSettings | null>;
    /**
     * 사용자 알림 설정 저장
     */
    static saveNotificationSettings(settings: NotificationSettings): Promise<void>;
    /**
     * 알림 템플릿 조회
     */
    static getNotificationTemplate(type: string, data: any): NotificationTemplate;
    /**
     * 단일 사용자에게 Push 알림 발송
     */
    static sendPushNotification(userId: string, template: NotificationTemplate, customData?: Record<string, string>): Promise<boolean>;
    /**
     * 토큰에 직접 알림 발송
     */
    private static sendToToken;
    /**
     * 시간 파싱 (HH:mm 형식)
     */
    private static parseTime;
    /**
     * 조용한 시간 확인
     */
    private static isInQuietHours;
    /**
     * 알림 통계 저장
     */
    static saveNotificationStats(stats: {
        sent: number;
        delivered: number;
        failed: number;
    }): Promise<void>;
}
//# sourceMappingURL=fcmService.d.ts.map