import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NotificationFrequency } from '@almus/shared-types';

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
  })
  taskDueReminder: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
  })
  taskStatusChange: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
  })
  taskAssigned: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
  })
  taskComment: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
  })
  taskOverdue: NotificationFrequency;

  @Column({
    type: 'enum',
    enum: NotificationFrequency,
    default: NotificationFrequency.IMMEDIATE,
  })
  systemAnnouncement: NotificationFrequency;

  @Column({ type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ type: 'boolean', default: true })
  inAppEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  slackEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  teamsEnabled: boolean;

  @Column({ type: 'boolean', default: false })
  kakaoEnabled: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  slackWebhook?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  teamsWebhook?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  kakaoWebhook?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => NotificationSettings, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user?: any;
}
