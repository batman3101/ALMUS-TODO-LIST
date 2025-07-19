import { ObjectType, Field, InputType, Int } from '@nestjs/graphql';

@ObjectType()
export class TaskType {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  assigneeId!: string;

  @Field()
  status!: string;

  @Field()
  priority!: string;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field()
  createdBy!: string;

  @Field()
  version!: number;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field(() => [String], { nullable: true })
  dependencies?: string[];

  @Field(() => Int, { nullable: true })
  progress?: number;
}

@InputType()
export class CreateTaskInputType {
  @Field()
  title!: string;

  @Field({ nullable: true })
  description?: string;

  @Field()
  assigneeId!: string;

  @Field()
  status!: string;

  @Field()
  priority!: string;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field(() => [String], { nullable: true })
  dependencies?: string[];

  @Field(() => Int, { nullable: true })
  progress?: number;
}

@InputType()
export class UpdateTaskInputType {
  @Field()
  id!: string;

  @Field()
  version!: number;

  @Field({ nullable: true })
  title?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  assigneeId?: string;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  priority?: string;

  @Field({ nullable: true })
  dueDate?: Date;

  @Field({ nullable: true })
  startDate?: Date;

  @Field({ nullable: true })
  endDate?: Date;

  @Field(() => [String], { nullable: true })
  dependencies?: string[];

  @Field(() => Int, { nullable: true })
  progress?: number;
}

@InputType()
export class TaskFilterInputType {
  @Field({ nullable: true })
  assigneeId?: string;

  @Field({ nullable: true })
  status?: string;

  @Field({ nullable: true })
  priority?: string;

  @Field({ nullable: true })
  teamId?: string;

  @Field({ nullable: true })
  projectId?: string;
}