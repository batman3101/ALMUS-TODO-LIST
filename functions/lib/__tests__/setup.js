"use strict";
// Jest 테스트 설정
beforeAll(() => {
    // 전역 테스트 설정
    process.env.NODE_ENV = 'test';
});
afterAll(() => {
    // 테스트 정리
});
// 커스텀 매처
expect.extend({
    toBeValidTask(received) {
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
    toHavePermission(received) {
        const pass = received === true;
        return {
            pass,
            message: () => `expected ${received} to be true (have permission)`,
        };
    },
});
//# sourceMappingURL=setup.js.map