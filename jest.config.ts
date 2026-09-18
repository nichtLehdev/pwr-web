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
  // `.claude/worktrees/` enthält vollständige Arbeitskopien des Projekts.
  // Ohne Ausschluss liest jest sie mit: gemessen 54 Testdateien im Baum gegen
  // 2065 darunter. Das blähte nicht nur die Zahlen auf (`jest notenwaage`
  // meldete 10 Suiten statt 2) — ein halbfertiger Stand in einer fremden
  // Arbeitskopie hätte den Lauf hier rot gefärbt, obwohl im Projekt nichts
  // kaputt ist. `modulePathIgnorePatterns` zusätzlich, damit auch die
  // doppelten Module dort nicht als Kollision auftauchen.
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/.claude/"],
  modulePathIgnorePatterns: ["<rootDir>/.claude/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^~/(.*)$": "<rootDir>/$1",
    // `marked` veröffentlicht nur noch ESM (`exports` zeigt auf
    // lib/marked.esm.js). next/jest lässt node_modules grundsätzlich
    // unübersetzt und erlaubt es auch nicht, das in dieser Datei zu ändern
    // („Custom config can append to transformIgnorePatterns but not modify
    // it") — der Test der Beschreibungs-Darstellung brach damit mit
    // „Unexpected token 'export'" ab. Das Paket liefert daneben ein
    // UMD-Bündel, das unter CommonJS lädt; die Typen kommen weiterhin aus
    // dem Paket, weil moduleNameMapper nur zur Laufzeit greift.
    "^marked$": "<rootDir>/node_modules/marked/lib/marked.umd.js",
  },
  // Pure-logic unit tests only — no DOM, no database.
  setupFiles: ["<rootDir>/jest.setup.ts"],
};

export default createJestConfig(config);
