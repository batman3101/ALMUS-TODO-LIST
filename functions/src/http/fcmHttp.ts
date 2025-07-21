import { onRequest } from 'firebase-functions/v2/https';
import { FCMService } from '../services/fcmService';
import { AuthUtils } from '../utils/auth';

// FCM 토큰 저장
export const saveFCMToken = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // 인증 확인
      const user = await AuthUtils.verifyToken(req);
      if (!user) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      const { token, platform } = req.body;

      if (!token || !platform) {
        res.status(400).json({ error: '토큰과 플랫폼이 필요합니다.' });
        return;
      }

      if (!['web', 'ios', 'android'].includes(platform)) {
        res.status(400).json({ error: '지원하지 않는 플랫폼입니다.' });
        return;
      }

      await FCMService.saveToken(user.uid, token, platform);

      res
        .status(200)
        .json({ success: true, message: 'FCM 토큰이 저장되었습니다.' });
    } catch (error) {
      console.error('FCM 토큰 저장 오류:', error);
      res.status(500).json({ error: 'FCM 토큰 저장에 실패했습니다.' });
    }
  }
);

// FCM 토큰 삭제
export const deleteFCMToken = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // 인증 확인
      const user = await AuthUtils.verifyToken(req);
      if (!user) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: '토큰이 필요합니다.' });
        return;
      }

      await FCMService.deleteToken(token);

      res
        .status(200)
        .json({ success: true, message: 'FCM 토큰이 삭제되었습니다.' });
    } catch (error) {
      console.error('FCM 토큰 삭제 오류:', error);
      res.status(500).json({ error: 'FCM 토큰 삭제에 실패했습니다.' });
    }
  }
);

// 알림 설정 조회
export const getNotificationSettings = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // 인증 확인
      const user = await AuthUtils.verifyToken(req);
      if (!user) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      const settings = await FCMService.getNotificationSettings(user.uid);

      if (!settings) {
        // 기본 설정 반환
        const defaultSettings = {
          userId: user.uid,
          pushEnabled: true,
          emailEnabled: true,
          inAppEnabled: true,
          taskCreated: true,
          taskUpdated: true,
          taskDueSoon: true,
          taskOverdue: true,
          teamUpdates: true,
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        res.status(200).json(defaultSettings);
        return;
      }

      res.status(200).json(settings);
    } catch (error) {
      console.error('알림 설정 조회 오류:', error);
      res.status(500).json({ error: '알림 설정 조회에 실패했습니다.' });
    }
  }
);

// 알림 설정 저장
export const saveNotificationSettings = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // 인증 확인
      const user = await AuthUtils.verifyToken(req);
      if (!user) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      const settings = req.body;

      if (!settings) {
        res.status(400).json({ error: '알림 설정이 필요합니다.' });
        return;
      }

      // 사용자 ID 설정
      settings.userId = user.uid;
      settings.updatedAt = new Date();

      await FCMService.saveNotificationSettings(settings);

      res
        .status(200)
        .json({ success: true, message: '알림 설정이 저장되었습니다.' });
    } catch (error) {
      console.error('알림 설정 저장 오류:', error);
      res.status(500).json({ error: '알림 설정 저장에 실패했습니다.' });
    }
  }
);

// 테스트 알림 발송
export const sendTestNotification = onRequest(
  {
    region: 'asia-northeast3',
    cors: true,
  },
  async (req, res) => {
    try {
      // 인증 확인
      const user = await AuthUtils.verifyToken(req);
      if (!user) {
        res.status(401).json({ error: '인증이 필요합니다.' });
        return;
      }

      const template = FCMService.getNotificationTemplate('TASK_CREATED', {
        title: '테스트 알림',
        taskId: 'test',
        teamId: 'test',
      });

      const success = await FCMService.sendPushNotification(user.uid, template);

      if (success) {
        res
          .status(200)
          .json({ success: true, message: '테스트 알림이 발송되었습니다.' });
      } else {
        res.status(400).json({ error: '테스트 알림 발송에 실패했습니다.' });
      }
    } catch (error) {
      console.error('테스트 알림 발송 오류:', error);
      res.status(500).json({ error: '테스트 알림 발송에 실패했습니다.' });
    }
  }
);
