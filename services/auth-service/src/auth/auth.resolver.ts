import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import type { LoginInput, LoginResponse, User } from '@almus/shared-types';
import { LoginResponseType, UserType, LoginInputType } from './dto/auth.types';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => LoginResponseType)
  async login(@Args('input') loginInput: LoginInputType): Promise<LoginResponse> {
    return this.authService.login(loginInput.email);
  }

  @Mutation(() => LoginResponseType)
  async refreshToken(
    @Args('refreshToken') refreshToken: string
  ): Promise<LoginResponse> {
    return this.authService.refreshToken(refreshToken);
  }

  @Query(() => UserType)
  async me(): Promise<User> {
    // TODO: 실제 사용자 정보 반환
    return {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'ADMIN' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
