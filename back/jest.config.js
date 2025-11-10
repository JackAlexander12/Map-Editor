/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  clearMocks: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'utils/**/*.js',
    'server.js'
  ]
};
