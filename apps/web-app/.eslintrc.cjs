module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  globals: {
    jest: 'readonly',
    describe: 'readonly',
    it: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly'
  },
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': 'off'
  }
};