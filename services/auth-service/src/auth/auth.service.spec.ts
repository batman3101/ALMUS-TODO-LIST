import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn().mockReturnValue({ email: 'test@example.com', userId: '1' }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user for valid email', async () => {
      const email = 'test@example.com';
      
      const result = await service.validateUser(email);
      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
      expect(result?.name).toBe('Test User');
    });
  });

  describe('login', () => {
    it('should return login response with tokens', async () => {
      const email = 'test@example.com';

      const result = await service.login(email);
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(email);
    });

    it('should throw UnauthorizedException for invalid user', async () => {
      // Mock validateUser to return null
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(service.login('invalid@example.com')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';

      const result = await service.refreshToken(refreshToken);
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBe('mock-jwt-token');
      expect(result.user).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jest.spyOn(jwtService, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('validateOAuthProfile', () => {
    it('should return user from OAuth profile', async () => {
      const profile = {
        id: 'oauth-id',
        email: 'oauth@example.com',
        name: 'OAuth User',
        avatar: 'avatar-url',
        provider: 'google' as const,
      };

      const result = await service.validateOAuthProfile(profile);
      expect(result).toBeDefined();
      expect(result.id).toBe(profile.id);
      expect(result.email).toBe(profile.email);
      expect(result.name).toBe(profile.name);
      expect(result.avatar).toBe(profile.avatar);
    });
  });
});