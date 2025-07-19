import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { LoginInput, LoginResponse, User } from '@almus/shared-types';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => LoginResponse)
  async login(@Args('input') loginInput: LoginInput): Promise<LoginResponse> {
    return this.authService.login(loginInput.email);
  }

  @Mutation(() => LoginResponse)
  async refreshToken(@Args('refreshToken') refreshToken: string): Promise<LoginResponse> {
    return this.authService.refreshToken(refreshToken);
  }

  @Query(() => User)
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