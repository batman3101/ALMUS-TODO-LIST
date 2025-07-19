// Jest 테스트 설정
beforeAll(() => {
  // 전역 테스트 설정
  process.env.NODE_ENV = 'test';
});

afterAll(() => {
  // 테스트 정리
});

// 전역 타입 정의
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTask(): R;
      toHavePermission(): R;
    }
  }
}

// 커스텀 매처
expect.extend({
  toBeValidTask(received: any) {
    const pass = received && 
      typeof received.title === 'string' &&
      typeof received.status === 'string' &&
      typeof received.priority === 'string' &&
      typeof received.teamId === 'string';

    return {
      pass,
      message: () => `expected ${received} to be a valid task`,
    };
  },

  toHavePermission(received: any) {
    const pass = received === true;
    return {
      pass,
      message: () => `expected ${received} to be true (have permission)`,
    };
  },
}); 