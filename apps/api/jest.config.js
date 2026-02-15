module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    // Only transform .ts files with ts-jest
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    // Map to the built dist folder
    '^@telegram-ads/shared$': '<rootDir>/../../../packages/shared/dist',
    '^@telegram-ads/shared/(.*)$': '<rootDir>/../../../packages/shared/dist/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/../dist/'],
  // Don't transform node_modules or dist files
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.js$',
  ],
};
