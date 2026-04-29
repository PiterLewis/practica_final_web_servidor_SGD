export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/tests/**/*.test.js'],
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',
  maxWorkers: 1,
  testTimeout: 60000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
    '!src/docs/**',
  ],
  coverageDirectory: 'coverage',
};
