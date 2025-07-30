import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { TaskStatus, TaskPriority } from '@almus/shared-types';

// Enum values for TypeORM
const TaskStatusEnum = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'] as const;
const TaskPriorityEnum = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'uuid' })
  assigneeId!: string;

  @Column({ type: 'uuid' })
  teamId!: string;

  @Column({ type: 'uuid' })
  projectId!: string;

  @Column({
    type: 'enum',
    enum: TaskStatusEnum,
    default: 'TODO',
  })
  status!: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskPriorityEnum,
    default: 'MEDIUM',
  })
  priority!: TaskPriority;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  startDate?: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate?: Date;

  @Column({ type: 'uuid' })
  createdBy!: string;

  @Column({ type: 'simple-array', default: '' })
  dependencies!: string[];

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee?: Task;

  @ManyToOne(() => Task, { nullable: true })
  @JoinColumn({ name: 'createdBy' })
  createdByUser?: Task;
}
