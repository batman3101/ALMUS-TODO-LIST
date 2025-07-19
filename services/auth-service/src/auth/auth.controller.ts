import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginInput, LoginResponse, User } from '@almus/shared-types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginInput: LoginInput): Promise<LoginResponse> {
    return this.authService.login(loginInput.email);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }): Promise<LoginResponse> {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req): Promise<User> {
    return req.user;
  }

  @Get('health')
  async health(): Promise<{ status: string }> {
    return { status: 'ok' };
  }
} 