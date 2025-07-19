import { useState, useEffect } from 'react';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { useAuth } from './useAuth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface NotificationSettings {
  userId: string;
  pushEnabled: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  taskCreated: boolean;
  taskUpdated: boolean;
  taskDueSoon: boolean;
  taskOverdue: boolean;
  teamUpdates: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const API_BASE_URL = process.env.VITE_FUNCTIONS_URL || 'http://localhost:5001/almus-todo-app/asia-northeast3';

export const useFCM = () => {
  const { user, isAuthenticated } = useAuth();
  const [messaging, setMessaging] = useState<any>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // FCM 초기화
  useEffect(() => {
    if (isAuthenticated && 'serviceWorker' in navigator) {
      const initFCM = async () => {
        try {
          const messagingInstance = getMessaging();
          setMessaging(messagingInstance);

          // FCM 토큰 요청
          const token = await getToken(messagingInstance, {
            vapidKey: process.env.VITE_FIREBASE_VAPID_KEY,
          });

          if (token) {
            setFcmToken(token);
            console.log('FCM 토큰 획득:', token);
          }
        } catch (error) {
          console.error('FCM 초기화 오류:', error);
        }
      };

      initFCM();
    }
  }, [isAuthenticated]);

  // FCM 토큰 저장
  const saveTokenMutation = useMutation({
    mutationFn: async ({ token, platform }: { token: string; platform: string }) => {
      const response = await fetch(`${API_BASE_URL}/saveFCMToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid}`,
        },
        body: JSON.stringify({ token, platform }),
      });

      if (!response.ok) {
        throw new Error('FCM 토큰 저장에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: () => {
      console.log('FCM 토큰이 저장되었습니다.');
    },
    onError: (error) => {
      console.error('FCM 토큰 저장 오류:', error);
    },
  });

  // FCM 토큰 삭제
  const deleteTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await fetch(`${API_BASE_URL}/deleteFCMToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('FCM 토큰 삭제에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: () => {
      console.log('FCM 토큰이 삭제되었습니다.');
    },
    onError: (error) => {
      console.error('FCM 토큰 삭제 오류:', error);
    },
  });

  // 알림 설정 조회
  const { data: notificationSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async (): Promise<NotificationSettings> => {
      const response = await fetch(`${API_BASE_URL}/getNotificationSettings`, {
        headers: {
          'Authorization': `Bearer ${user?.uid}`,
        },
      });

      if (!response.ok) {
        throw new Error('알림 설정 조회에 실패했습니다.');
      }

      return response.json();
    },
    enabled: !!user,
  });

  // 알림 설정 저장
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const response = await fetch(`${API_BASE_URL}/saveNotificationSettings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.uid}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('알림 설정 저장에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      console.log('알림 설정이 저장되었습니다.');
    },
    onError: (error) => {
      console.error('알림 설정 저장 오류:', error);
    },
  });

  // 테스트 알림 발송
  const sendTestNotificationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/sendTestNotification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.uid}`,
        },
      });

      if (!response.ok) {
        throw new Error('테스트 알림 발송에 실패했습니다.');
      }

      return response.json();
    },
    onSuccess: () => {
      console.log('테스트 알림이 발송되었습니다.');
    },
    onError: (error) => {
      console.error('테스트 알림 발송 오류:', error);
    },
  });

  // FCM 토큰 자동 저장
  useEffect(() => {
    if (fcmToken && user) {
      saveTokenMutation.mutate({
        token: fcmToken,
        platform: 'web',
      });
    }
  }, [fcmToken, user]);

  // 포그라운드 메시지 처리
  useEffect(() => {
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('포그라운드 메시지 수신:', payload);
        
        // 브라우저 알림 표시
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification(payload.notification?.title || '알림', {
            body: payload.notification?.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            tag: payload.data?.type,
            data: payload.data,
          });

          // 알림 클릭 시 처리
          notification.onclick = () => {
            window.focus();
            notification.close();
            
            // Task 페이지로 이동
            if (payload.data?.taskId) {
              window.location.href = `/tasks/${payload.data.taskId}`;
            }
          };
        }
      });

      return () => unsubscribe();
    }
  }, [messaging]);

  // 알림 권한 요청
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // FCM 구독 해제
  const unsubscribeFromFCM = async () => {
    if (fcmToken) {
      try {
        await deleteToken(messaging);
        await deleteTokenMutation.mutateAsync(fcmToken);
        setFcmToken(null);
        console.log('FCM 구독이 해제되었습니다.');
      } catch (error) {
        console.error('FCM 구독 해제 오류:', error);
      }
    }
  };

  return {
    fcmToken,
    notificationSettings,
    settingsLoading,
    saveToken: saveTokenMutation.mutateAsync,
    deleteToken: deleteTokenMutation.mutateAsync,
    saveSettings: saveSettingsMutation.mutateAsync,
    sendTestNotification: sendTestNotificationMutation.mutateAsync,
    requestNotificationPermission,
    unsubscribeFromFCM,
  };
}; 