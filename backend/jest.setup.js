// Jest setup file
// Set test environment variables
process.env.NODE_ENV = "test";
process.env.GEMINI_API_KEY = "test-api-key";
process.env.PORT = 3001;

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
