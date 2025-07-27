import { logger } from './logger';

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
const mockConsoleInfo = jest.spyOn(console, 'info').mockImplementation();
const mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe('error', () => {
    it('should always log errors', () => {
      logger.error('Test error', { data: 'test' });
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] Test error', {
        data: 'test',
      });
    });
  });

  describe('warn', () => {
    it('should always log warnings', () => {
      logger.warn('Test warning', { data: 'test' });
      expect(mockConsoleWarn).toHaveBeenCalledWith('[WARN] Test warning', {
        data: 'test',
      });
    });
  });

  describe('development environment', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = 'development';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should log info in development', () => {
      logger.info('Test info', { data: 'test' });
      expect(mockConsoleInfo).toHaveBeenCalledWith('[INFO] Test info', {
        data: 'test',
      });
    });

    it('should log debug in development', () => {
      logger.debug('Test debug', { data: 'test' });
      expect(mockConsoleDebug).toHaveBeenCalledWith('[DEBUG] Test debug', {
        data: 'test',
      });
    });

    it('should log general logs in development', () => {
      logger.log('Test log', { data: 'test' });
      expect(mockConsoleLog).toHaveBeenCalledWith('[LOG] Test log', {
        data: 'test',
      });
    });
  });

  describe('production environment', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeAll(() => {
      process.env.NODE_ENV = 'production';
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log info in production', () => {
      logger.info('Test info', { data: 'test' });
      expect(mockConsoleInfo).not.toHaveBeenCalled();
    });

    it('should not log debug in production', () => {
      logger.debug('Test debug', { data: 'test' });
      expect(mockConsoleDebug).not.toHaveBeenCalled();
    });

    it('should not log general logs in production', () => {
      logger.log('Test log', { data: 'test' });
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });
});
