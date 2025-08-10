import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { supabase } from '@/lib/supabase-client.ts';
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

export const useFCM = () => {
  const { user, isAuthenticated } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // 브라우저 알림 권한 확인 및 초기화
  useEffect(() => {
    if (isAuthenticated && 'Notification' in window) {
      // 기본 브라우저 알림으로 대체 (FCM 대신 사용)
      if (Notification.permission === 'granted') {
        setFcmToken('browser-notification-enabled');
      }
    }
  }, [isAuthenticated]);

  // 알림 토큰 저장
  const saveTokenMutation = useMutation({
    mutationFn: async ({
      token,
      platform,
    }: {
      token: string;
      platform: string;
    }) => {
      const { error } = await supabase.from('notification_tokens').upsert(
        {
          user_id: user?.uid,
          token,
          platform,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,platform',
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      logger.log('알림 토큰이 저장되었습니다.');
    },
    onError: error => {
      logger.error('알림 토큰 저장 오류:', error);
    },
  });

  // 알림 토큰 삭제
  const deleteTokenMutation = useMutation({
    mutationFn: async (token: string) => {
      const { error } = await supabase
        .from('notification_tokens')
        .update({ is_active: false })
        .eq('user_id', user?.uid)
        .eq('token', token);

      if (error) throw error;
    },
    onSuccess: () => {
      logger.log('알림 토큰이 삭제되었습니다.');
    },
    onError: error => {
      logger.error('알림 토큰 삭제 오류:', error);
    },
  });

  // 알림 설정 조회
  const { data: notificationSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async (): Promise<NotificationSettings> => {
      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user?.uid)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // 기본 설정 생성
        const defaultSettings = {
          user_id: user?.uid,
          push_enabled: true,
          email_enabled: true,
          in_app_enabled: true,
          task_created: true,
          task_updated: true,
          task_due_soon: true,
          task_overdue: true,
          team_updates: true,
          quiet_hours_enabled: false,
          quiet_hours_start: '22:00',
          quiet_hours_end: '08:00',
        };

        const { data: created, error: createError } = await supabase
          .from('notification_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (createError) throw createError;
        return {
          userId: created.user_id,
          pushEnabled: created.push_enabled,
          emailEnabled: created.email_enabled,
          inAppEnabled: created.in_app_enabled,
          taskCreated: created.task_created,
          taskUpdated: created.task_updated,
          taskDueSoon: created.task_due_soon,
          taskOverdue: created.task_overdue,
          teamUpdates: created.team_updates,
          quietHours: {
            enabled: created.quiet_hours_enabled,
            start: created.quiet_hours_start,
            end: created.quiet_hours_end,
          },
          createdAt: new Date(created.created_at),
          updatedAt: new Date(created.updated_at),
        };
      }

      return {
        userId: data.user_id,
        pushEnabled: data.push_enabled,
        emailEnabled: data.email_enabled,
        inAppEnabled: data.in_app_enabled,
        taskCreated: data.task_created,
        taskUpdated: data.task_updated,
        taskDueSoon: data.task_due_soon,
        taskOverdue: data.task_overdue,
        teamUpdates: data.team_updates,
        quietHours: {
          enabled: data.quiet_hours_enabled,
          start: data.quiet_hours_start,
          end: data.quiet_hours_end,
        },
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    },
    enabled: !!user,
  });

  // 알림 설정 저장
  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: Partial<NotificationSettings>) => {
      const { error } = await supabase.from('notification_settings').upsert(
        {
          user_id: user?.uid,
          push_enabled: settings.pushEnabled,
          email_enabled: settings.emailEnabled,
          in_app_enabled: settings.inAppEnabled,
          task_created: settings.taskCreated,
          task_updated: settings.taskUpdated,
          task_due_soon: settings.taskDueSoon,
          task_overdue: settings.taskOverdue,
          team_updates: settings.teamUpdates,
          quiet_hours_enabled: settings.quietHours?.enabled,
          quiet_hours_start: settings.quietHours?.start,
          quiet_hours_end: settings.quietHours?.end,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationSettings'] });
      logger.log('알림 설정이 저장되었습니다.');
    },
    onError: error => {
      logger.error('알림 설정 저장 오류:', error);
    },
  });

  // 테스트 알림 발송
  const sendTestNotificationMutation = useMutation({
    mutationFn: async () => {
      // 브라우저 알림으로 테스트 알림 표시
      if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('테스트 알림', {
          body: '알림 설정이 정상적으로 작동합니다.',
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: 'test-notification',
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        return { success: true };
      } else {
        throw new Error('알림 권한이 없습니다.');
      }
    },
    onSuccess: () => {
      logger.log('테스트 알림이 발송되었습니다.');
    },
    onError: error => {
      logger.error('테스트 알림 발송 오류:', error);
    },
  });

  // 알림 토큰 자동 저장
  useEffect(() => {
    if (fcmToken && user) {
      saveTokenMutation.mutate({
        token: fcmToken,
        platform: 'web',
      });
    }
  }, [fcmToken, user]);

  // 알림 권한 요청
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setFcmToken('browser-notification-enabled');
      }
      return permission === 'granted';
    }
    return false;
  };

  // 알림 구독 해제
  const unsubscribeFromFCM = async () => {
    if (fcmToken) {
      try {
        await deleteTokenMutation.mutateAsync(fcmToken);
        setFcmToken(null);
        logger.log('알림 구독이 해제되었습니다.');
      } catch (error) {
        logger.error('알림 구독 해제 오류:', error);
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
