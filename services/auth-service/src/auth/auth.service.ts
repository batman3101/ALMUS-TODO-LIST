import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  User,
  UserRole,
  LoginResponse,
  OAuthProfile,
} from '@almus/shared-types';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async validateUser(email: string): Promise<User | null> {
    // TODO: 실제 데이터베이스에서 사용자 조회
    // 임시로 하드코딩된 사용자 반환
    return {
      id: '1',
      email,
      name: 'Test User',
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async login(email: string): Promise<LoginResponse> {
    const user = await this.validateUser(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async validateOAuthProfile(profile: OAuthProfile): Promise<User> {
    // TODO: OAuth 프로필을 기반으로 사용자 생성 또는 업데이트
    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: UserRole.EDITOR,
      avatar: profile.avatar,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async refreshToken(token: string): Promise<LoginResponse> {
    try {
      const payload = this.jwtService.verify(token);
      const user = await this.validateUser(payload.email);

      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      const newPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(newPayload);
      const refreshToken = this.jwtService.sign(newPayload, {
        expiresIn: '7d',
      });

      return {
        accessToken,
        refreshToken,
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
