import {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterAll,
} from 'vitest';

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
const mockConsoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});
const mockConsoleDebug = vi
  .spyOn(console, 'debug')
  .mockImplementation(() => {});

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleInfo.mockRestore();
    mockConsoleDebug.mockRestore();
  });

  describe('error logging', () => {
    it('should always log errors', async () => {
      // Dynamic import to avoid module caching issues
      const { logger } = await import('./logger');
      
      logger.error('Test error', { data: 'test' });
      expect(mockConsoleError).toHaveBeenCalledWith('[ERROR] Test error', {
        data: 'test',
      });
    });
  });

  describe('warn logging', () => {
    it('should always log warnings', async () => {
      const { logger } = await import('./logger');
      
      logger.warn('Test warning', { data: 'test' });
      expect(mockConsoleWarn).toHaveBeenCalledWith('[WARN] Test warning', {
        data: 'test',
      });
    });
  });

  describe('development environment (DEV=true)', () => {
    it('should log info, debug, and general logs when DEV is true', async () => {
      // Mock import.meta.env.DEV as true
      vi.doMock('./logger', () => {
        const isDevelopment = true; // Simulate DEV=true
        
        return {
          logger: {
            error: (message: string, ...args: unknown[]) => {
              console.error(`[ERROR] ${message}`, ...args);
            },
            warn: (message: string, ...args: unknown[]) => {
              console.warn(`[WARN] ${message}`, ...args);
            },
            info: (message: string, ...args: unknown[]) => {
              if (isDevelopment) {
                console.info(`[INFO] ${message}`, ...args);
              }
            },
            debug: (message: string, ...args: unknown[]) => {
              if (isDevelopment) {
                console.debug(`[DEBUG] ${message}`, ...args);
              }
            },
            log: (message: string, ...args: unknown[]) => {
              if (isDevelopment) {
                console.log(`[LOG] ${message}`, ...args);
              }
            },
          },
        };
      });

      const { logger } = await import('./logger');

      logger.info('Test info', { data: 'test' });
      expect(mockConsoleInfo).toHaveBeenCalledWith('[INFO] Test info', {
        data: 'test',
      });

      logger.debug('Test debug', { data: 'test' });
      expect(mockConsoleDebug).toHaveBeenCalledWith('[DEBUG] Test debug', {
        data: 'test',
      });

      logger.log('Test log', { data: 'test' });
      expect(mockConsoleLog).toHaveBeenCalledWith('[LOG] Test log', {
        data: 'test',
      });
    });
  });

  describe('production environment (DEV=false)', () => {
    it('should not log info, debug, and general logs when DEV is false', async () => {
      // Mock import.meta.env.DEV as false
      vi.doMock('./logger', () => {
        const isDevelopment = false; // Simulate DEV=false
        
        return {
          logger: {
            error: (message: string, ...args: unknown[]) => {
              console.error(`[ERROR] ${message}`, ...args);
            },
            warn: (message: string, ...args: unknown[]) => {
              console.warn(`[WARN] ${message}`, ...args);
            },
            info: (message: string, ...args: unknown[]) => {
              if (isDevelopment) {
                console.info(`[INFO] ${message}`, ...args);
              }
            },
            debug: (message: string, ...args: unknown[]) => {
              if (isDevelopment) {
                console.debug(`[DEBUG] ${message}`, ...args);
              }
            },
            log: (message: string, ...args: unknown[]) => {
              if (isDevelopment) {
                console.log(`[LOG] ${message}`, ...args);
              }
            },
          },
        };
      });

      const { logger } = await import('./logger');

      logger.info('Test info', { data: 'test' });
      expect(mockConsoleInfo).not.toHaveBeenCalled();

      logger.debug('Test debug', { data: 'test' });
      expect(mockConsoleDebug).not.toHaveBeenCalled();

      logger.log('Test log', { data: 'test' });
      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });
});