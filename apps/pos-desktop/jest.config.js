module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
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
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx)', '**/*.(test|spec).(ts|tsx)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
