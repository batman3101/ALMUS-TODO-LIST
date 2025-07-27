import { describe, it, expect } from 'vitest';

describe('Simple Test', () => {
  it('기본 테스트가 작동한다', () => {
    expect(1 + 1).toBe(2);
  });

  it('문자열 테스트가 작동한다', () => {
    expect('hello').toBe('hello');
  });

  it('배열 테스트가 작동한다', () => {
    const arr = [1, 2, 3];
    expect(arr).toContain(2);
  });

  it('객체 테스트가 작동한다', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj).toEqual({ name: 'test', value: 42 });
  });

  it('비동기 테스트가 작동한다', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });
});
