import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest evaluates next.config.js, which imports the t3-env validator;
// unit tests need no real environment.
process.env.SKIP_ENV_VALIDATION ??= "1";

const createJestConfig = nextJest({
  // Load next.config.js and .env in the test environment
  dir: "./",
});

const config: Config = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  // `.claude/worktrees/` enthält vollständige Arbeitskopien; deren Tests und
  // doppelte Module sollen hier nicht mitlaufen.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/.claude/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^~/(.*)$": "<rootDir>/$1",
    // `marked` ist nur ESM, und next/jest übersetzt node_modules nicht (nicht
    // änderbar). Das UMD-Bündel lädt unter CommonJS; die Typen bleiben unberührt.
    "^marked$": "<rootDir>/node_modules/marked/lib/marked.umd.js",
  },
  // Pure-logic unit tests only — no DOM, no database.
  setupFiles: ["<rootDir>/jest.setup.ts"],
};

export default createJestConfig(config);
