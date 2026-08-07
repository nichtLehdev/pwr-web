import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest evaluates next.config.js, which imports the t3-env validator.
// Unit tests are pure and need no real environment — skip validation before
// the config loads (same escape hatch the Docker build uses).
process.env.SKIP_ENV_VALIDATION ??= "1";

const createJestConfig = nextJest({
  // Load next.config.js and .env in the test environment
  dir: "./",
});

const config: Config = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^~/(.*)$": "<rootDir>/$1",
  },
  // Pure-logic unit tests only — no DOM, no database.
  setupFiles: ["<rootDir>/jest.setup.ts"],
};

export default createJestConfig(config);
