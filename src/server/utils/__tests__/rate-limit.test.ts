import { describe, expect, it, jest } from "@jest/globals";
import { clientKeyFromHeaders, rateLimit } from "../rate-limit";

describe("rateLimit", () => {
  it("allows up to maxRequests inside the window and blocks after", () => {
    const key = `test-${Math.random()}`;
    const options = { maxRequests: 3, windowMs: 60_000 };

    expect(rateLimit(key, options).success).toBe(true);
    expect(rateLimit(key, options).success).toBe(true);
    const third = rateLimit(key, options);
    expect(third.success).toBe(true);
    expect(third.remaining).toBe(0);
    expect(rateLimit(key, options).success).toBe(false);
  });

  it("resets after the window elapses", () => {
    jest.useFakeTimers();
    try {
      const key = `test-${Math.random()}`;
      const options = { maxRequests: 1, windowMs: 1000 };

      expect(rateLimit(key, options).success).toBe(true);
      expect(rateLimit(key, options).success).toBe(false);

      jest.advanceTimersByTime(1500);
      expect(rateLimit(key, options).success).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  it("tracks keys independently", () => {
    const options = { maxRequests: 1, windowMs: 60_000 };
    const a = `test-${Math.random()}`;
    const b = `test-${Math.random()}`;
    expect(rateLimit(a, options).success).toBe(true);
    expect(rateLimit(b, options).success).toBe(true);
    expect(rateLimit(a, options).success).toBe(false);
  });
});

describe("clientKeyFromHeaders", () => {
  it("uses the first x-forwarded-for entry", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    });
    expect(clientKeyFromHeaders(headers)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "203.0.113.9" });
    expect(clientKeyFromHeaders(headers)).toBe("203.0.113.9");
  });

  it("falls back to a shared bucket without headers", () => {
    expect(clientKeyFromHeaders(new Headers())).toBe("unknown");
  });
});
