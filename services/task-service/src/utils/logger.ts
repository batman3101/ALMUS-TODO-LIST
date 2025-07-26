/**
 * 개발/프로덕션 환경을 고려한 로깅 유틸리티
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * 에러 로그 (프로덕션에서도 출력)
   */
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * 경고 로그 (프로덕션에서도 출력)
   */
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * 정보 로그 (개발 환경에서만 출력)
   */
  info: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * 디버그 로그 (개발 환경에서만 출력)
   */
  debug: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * 일반 로그 (개발 환경에서만 출력)
   */
  log: (message: string, ...args: unknown[]) => {
    if (isDevelopment) {
      console.log(`[LOG] ${message}`, ...args);
    }
  },
};

export default logger;