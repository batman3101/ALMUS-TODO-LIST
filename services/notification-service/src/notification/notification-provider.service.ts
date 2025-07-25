import { Injectable } from '@nestjs/common';

@Injectable()
export class NotificationProviderService {
  async sendPushNotification(data: any): Promise<boolean> {
    // TODO: FCM 푸시 알림 발송 로직 구현
    return true;
  }

  async sendEmailNotification(data: any): Promise<boolean> {
    // TODO: 이메일 알림 발송 로직 구현
    return true;
  }

  async sendSMSNotification(data: any): Promise<boolean> {
    // TODO: SMS 알림 발송 로직 구현
    return true;
  }

  async sendInAppNotification(data: any): Promise<boolean> {
    // TODO: 인앱 알림 발송 로직 구현
    return true;
  }
}