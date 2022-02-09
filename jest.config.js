module.exports = {
  clearMocks: true,
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },
  moduleFileExtensions: ["js", "ts", "tsx"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/__tests__/*.+(ts|tsx|js)"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  watchman: true,
  preset: "ts-jest",
};
