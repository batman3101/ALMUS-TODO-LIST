import { ObjectType, Field, InputType } from '@nestjs/graphql';

@ObjectType()
export class LoginResponseType {
  @Field()
  accessToken!: string;

  @Field()
  refreshToken!: string;

  @Field()
  user!: UserType;
}

@ObjectType()
export class UserType {
  @Field()
  id!: string;

  @Field()
  email!: string;

  @Field()
  name!: string;

  @Field()
  role!: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@InputType()
export class LoginInputType {
  @Field()
  email!: string;

  @Field()
  password!: string;
}
