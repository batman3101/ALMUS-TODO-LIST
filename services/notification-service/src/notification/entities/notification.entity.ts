import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { NotificationType, NotificationChannel } from '@almus/shared-types';

// Enum values for TypeORM
const NotificationTypeEnum = [
  'TASK_ASSIGNED',
  'TASK_DUE',
  'TASK_COMPLETED',
  'TASK_COMMENT',
  'TASK_OVERDUE',
  'MENTION',
  'SYSTEM_ANNOUNCEMENT'
] as const;

const NotificationChannelEnum = [
  'EMAIL',
  'PUSH',
  'IN_APP',
  'SLACK',
  'TEAMS',
  'KAKAO'
] as const;

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: NotificationTypeEnum,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data?: Record<string, any>;

  @Column({ type: 'enum', enum: NotificationChannelEnum, array: true })
  channels: NotificationChannel[];

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'boolean', default: false })
  is_sent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sent_at?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Notification, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: any;
}
