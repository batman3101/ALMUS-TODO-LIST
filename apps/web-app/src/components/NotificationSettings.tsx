import React, { useState } from 'react';
import { useFCM } from '../hooks/useFCM';

const NotificationSettings: React.FC = () => {
  const {
    notificationSettings,
    settingsLoading,
    saveSettings,
    sendTestNotification,
    requestNotificationPermission,
    unsubscribeFromFCM,
  } = useFCM();

  const [settings, setSettings] = useState(notificationSettings);

  React.useEffect(() => {
    if (notificationSettings) {
      setSettings(notificationSettings);
    }
  }, [notificationSettings]);

  const handleSettingChange = (key: string, value: any) => {
    if (settings) {
      setSettings({
        ...settings,
        [key]: value,
      });
    }
  };

  const handleQuietHoursChange = (key: string, value: any) => {
    if (settings) {
      setSettings({
        ...settings,
        quietHours: {
          ...settings.quietHours,
          [key]: value,
        },
      });
    }
  };

  const handleSaveSettings = () => {
    if (settings) {
      saveSettings(settings);
    }
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      alert('알림 권한이 허용되었습니다.');
    } else {
      alert('알림 권한이 거부되었습니다.');
    }
  };

  const handleTestNotification = () => {
    sendTestNotification();
  };

  const handleUnsubscribe = async () => {
    if (confirm('FCM 구독을 해제하시겠습니까?')) {
      await unsubscribeFromFCM();
      alert('FCM 구독이 해제되었습니다.');
    }
  };

  if (settingsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="p-6">
        <p className="text-gray-500">알림 설정을 불러올 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-6">알림 설정</h2>

      <div className="space-y-6">
        {/* 알림 권한 */}
        <div>
          <h3 className="text-lg font-medium mb-3">알림 권한</h3>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleRequestPermission}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              알림 권한 요청
            </button>
            <button
              onClick={handleUnsubscribe}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              FCM 구독 해제
            </button>
          </div>
        </div>

        {/* 알림 채널 */}
        <div>
          <h3 className="text-lg font-medium mb-3">알림 채널</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.pushEnabled}
                onChange={e =>
                  handleSettingChange('pushEnabled', e.target.checked)
                }
                className="mr-2"
              />
              Push 알림
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={e =>
                  handleSettingChange('emailEnabled', e.target.checked)
                }
                className="mr-2"
              />
              이메일 알림
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.inAppEnabled}
                onChange={e =>
                  handleSettingChange('inAppEnabled', e.target.checked)
                }
                className="mr-2"
              />
              In-App 알림
            </label>
          </div>
        </div>

        {/* 알림 유형 */}
        <div>
          <h3 className="text-lg font-medium mb-3">알림 유형</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.taskCreated}
                onChange={e =>
                  handleSettingChange('taskCreated', e.target.checked)
                }
                className="mr-2"
              />
              새 Task 생성
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.taskUpdated}
                onChange={e =>
                  handleSettingChange('taskUpdated', e.target.checked)
                }
                className="mr-2"
              />
              Task 업데이트
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.taskDueSoon}
                onChange={e =>
                  handleSettingChange('taskDueSoon', e.target.checked)
                }
                className="mr-2"
              />
              마감일 임박
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.taskOverdue}
                onChange={e =>
                  handleSettingChange('taskOverdue', e.target.checked)
                }
                className="mr-2"
              />
              마감일 지연
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.teamUpdates}
                onChange={e =>
                  handleSettingChange('teamUpdates', e.target.checked)
                }
                className="mr-2"
              />
              팀 업데이트
            </label>
          </div>
        </div>

        {/* 조용한 시간 */}
        <div>
          <h3 className="text-lg font-medium mb-3">조용한 시간</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.quietHours.enabled}
                onChange={e =>
                  handleQuietHoursChange('enabled', e.target.checked)
                }
                className="mr-2"
              />
              조용한 시간 활성화
            </label>
            {settings.quietHours.enabled && (
              <div className="flex items-center space-x-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    시작 시간
                  </label>
                  <input
                    type="time"
                    value={settings.quietHours.start}
                    onChange={e =>
                      handleQuietHoursChange('start', e.target.value)
                    }
                    className="border rounded px-3 py-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    종료 시간
                  </label>
                  <input
                    type="time"
                    value={settings.quietHours.end}
                    onChange={e =>
                      handleQuietHoursChange('end', e.target.value)
                    }
                    className="border rounded px-3 py-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 테스트 알림 */}
        <div>
          <h3 className="text-lg font-medium mb-3">테스트</h3>
          <button
            onClick={handleTestNotification}
            disabled={false} // sendTestNotificationMutation.isPending is removed
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {/* {sendTestNotificationMutation.isPending ? '발송 중...' : '테스트 알림 발송'} */}
            테스트 알림 발송
          </button>
        </div>

        {/* 저장 버튼 */}
        <div className="pt-4 border-t">
          <button
            onClick={handleSaveSettings}
            disabled={false} // saveSettingsMutation.isPending is removed
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {/* {saveSettingsMutation.isPending ? '저장 중...' : '설정 저장'} */}
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
