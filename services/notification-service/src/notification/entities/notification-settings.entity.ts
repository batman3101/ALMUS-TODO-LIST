import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { NotificationFrequency } from '@almus/shared-types';

// Enum values for TypeORM
const NotificationFrequencyEnum = ['IMMEDIATE', 'HOURLY', 'DAILY', 'WEEKLY', 'NEVER'] as const;

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    type: 'enum',
    enum: NotificationFrequencyEnum,
    default: 'IMMEDIATE',
  })
  task_due_reminder: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequencyEnum,
    default: 'IMMEDIATE',
  })
  task_status_change: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequencyEnum,
    default: 'IMMEDIATE',
  })
  task_assigned: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequencyEnum,
    default: 'IMMEDIATE',
  })
  task_comment: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequencyEnum,
    default: 'IMMEDIATE',
  })
  task_overdue: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequencyEnum,
    default: 'IMMEDIATE',
  })
  system_announcement: NotificationFrequency;

  @Column({ type: 'boolean', default: true })
  email_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  push_enabled: boolean;

  @Column({ type: 'boolean', default: true })
  in_app_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  slack_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  teams_enabled: boolean;

  @Column({ type: 'boolean', default: false })
  kakao_enabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email_address?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  slack_webhook?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  teams_webhook?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  kakao_webhook?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => NotificationSettings, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: any;
}
