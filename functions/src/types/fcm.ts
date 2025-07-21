export interface FCMToken {
  userId: string;
  token: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface FCMMessage {
  token?: string;
  topic?: string;
  notification?: {
    title: string;
    body: string;
    image?: string;
  };
  data?: Record<string, string>;
  android?: {
    priority?: 'normal' | 'high';
    notification?: {
      channelId?: string;
      priority?: 'min' | 'low' | 'default' | 'high' | 'max';
      defaultSound?: boolean;
      defaultVibrateTimings?: boolean;
      defaultLightSettings?: boolean;
    };
  };
  apns?: {
    payload?: {
      aps?: {
        alert?: {
          title?: string;
          body?: string;
        };
        badge?: number;
        sound?: string;
        category?: string;
        'content-available'?: number;
        'mutable-content'?: number;
        'thread-id'?: string;
      };
    };
    fcmOptions?: {
      image?: string;
    };
  };
  webpush?: {
    headers?: Record<string, string>;
    notification?: {
      title?: string;
      body?: string;
      icon?: string;
      badge?: string;
      image?: string;
      tag?: string;
      data?: Record<string, any>;
      actions?: Array<{
        action: string;
        title: string;
        icon?: string;
      }>;
    };
    fcmOptions?: {
      link?: string;
      analyticsLabel?: string;
    };
  };
}

export interface NotificationSettings {
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
    start: string; // HH:mm
    end: string; // HH:mm
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationTemplate {
  type:
    | 'TASK_CREATED'
    | 'TASK_UPDATED'
    | 'TASK_DUE_SOON'
    | 'TASK_OVERDUE'
    | 'TEAM_UPDATE';
  title: string;
  body: string;
  data?: Record<string, string>;
  priority: 'normal' | 'high';
  androidChannelId?: string;
}

export interface NotificationStats {
  sent: number;
  delivered: number;
  failed: number;
  timestamp: Date;
}
