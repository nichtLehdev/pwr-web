/**
 * Threshold: `debug` in development, `warn` in production, override with LOG_LEVEL.
 * Reads `process.env` directly, not `@/env`: must work before env validation.
 */

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
} as const;

export type LogLevel = keyof typeof LEVELS;

function resolveThreshold(): number {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (configured && configured in LEVELS) {
    return LEVELS[configured as LogLevel];
  }
  // A typo in LOG_LEVEL must never take the server down.
  return process.env.NODE_ENV === "production" ? LEVELS.warn : LEVELS.debug;
}

const threshold = resolveThreshold();

/** True when `level` would actually be printed. Guard expensive payloads with it. */
export function isLevelEnabled(level: LogLevel): boolean {
  return LEVELS[level] >= threshold;
}

function emit(level: LogLevel, scope: string, args: unknown[]) {
  if (!isLevelEnabled(level)) return;

  const prefix = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}]`;

  // error/warn go to stderr so `docker logs` can be split by stream.
  if (level === "error") {
    console.error(prefix, ...args);
  } else if (level === "warn") {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  isLevelEnabled: (level: LogLevel) => boolean;
}

/** Prefixes every line with `[scope]`. */
export function createLogger(scope: string): Logger {
  return {
    debug: (...args) => emit("debug", scope, args),
    info: (...args) => emit("info", scope, args),
    warn: (...args) => emit("warn", scope, args),
    error: (...args) => emit("error", scope, args),
    isLevelEnabled,
  };
}
