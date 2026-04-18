module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/renderer/$1',
    '^@components/(.*)$': '<rootDir>/src/renderer/components/$1',
    '^@screens/(.*)$': '<rootDir>/src/renderer/screens/$1',
    '^@stores/(.*)$': '<rootDir>/src/renderer/stores/$1',
    '^@services/(.*)$': '<rootDir>/src/renderer/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/renderer/hooks/$1',
    '^@types/(.*)$': '<rootDir>/src/renderer/types/$1',
    '^@utils/(.*)$': '<rootDir>/src/renderer/utils/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(zustand)/)',
  ],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)', '**/*.(test|spec).(ts|tsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
