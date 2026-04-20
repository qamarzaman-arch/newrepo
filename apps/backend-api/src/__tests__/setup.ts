// Test setup file
import { prisma } from '../config/database';

// Mock database for tests
jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    menuItem: {
      findMany: jest.fn(),
    },
    setting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(10000);
