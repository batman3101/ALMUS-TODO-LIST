import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(() => ({
      accessToken: 'jwt-access-token',
      refreshToken: 'jwt-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN' as const,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    })),
    refreshToken: jest.fn(() => ({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'ADMIN' as const,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return login response with tokens', async () => {
      const loginInput = {
        email: 'test@example.com',
        password: 'password',
      };

      const result = await controller.login(loginInput);

      expect(result).toEqual({
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      });
      expect(service.login).toHaveBeenCalledWith(loginInput.email);
    });
  });

  describe('refresh', () => {
    it('should return new tokens', async () => {
      const refreshBody = {
        refreshToken: 'valid-refresh-token',
      };

      const result = await controller.refresh(refreshBody);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN',
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      });
      expect(service.refreshToken).toHaveBeenCalledWith(
        refreshBody.refreshToken
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', async () => {
      const req = {
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'ADMIN' as const,
          is_active: true,
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
      };

      const result = await controller.getProfile(req);

      expect(result).toEqual(req.user);
    });
  });

  describe('health', () => {
    it('should return health status', async () => {
      const result = await controller.health();

      expect(result).toEqual({ status: 'ok' });
    });
  });
});
