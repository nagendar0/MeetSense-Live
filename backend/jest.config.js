module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.js", "**/*.test.js"],
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "**/*.js",
    "!server.js",
    "!jest.config.js",
    "!**/node_modules/**",
  ],
  verbose: true,
  testTimeout: 30000,
  modulePathIgnorePatterns: ["<rootDir>/node_modules/"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Mock external dependencies
  moduleNameMapper: {
    "^@google/generative-ai$": "<rootDir>/__mocks__/@google/generative-ai.js",
  },
};
