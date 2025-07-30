import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { NotificationType } from '@almus/shared-types';

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

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: NotificationTypeEnum,
  })
  type: NotificationType;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', array: true, default: [] })
  variables: string[];

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
