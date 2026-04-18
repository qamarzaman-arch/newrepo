require('@testing-library/jest-dom');

// Mock localStorage for zustand persist
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: () => Math.random().toString(36).substring(2, 15),
};
