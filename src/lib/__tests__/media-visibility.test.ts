import { describe, expect, it } from "@jest/globals";
import { ContentStatus } from "~/generated/prisma/enums";
import { needsUnoptimizedImage } from "@/lib/media-visibility";

describe("needsUnoptimizedImage", () => {
  it("optimiert freigegebene, öffentliche Medien", () => {
    expect(
      needsUnoptimizedImage({
        status: ContentStatus.APPROVED,
        isPublic: true,
      }),
    ).toBe(false);
  });

  it("umgeht den Optimierer für ungeprüfte Medien", () => {
    expect(
      needsUnoptimizedImage({ status: ContentStatus.PENDING, isPublic: true }),
    ).toBe(true);
    expect(needsUnoptimizedImage({ status: ContentStatus.PENDING })).toBe(true);
  });

  it("umgeht den Optimierer für private Medien", () => {
    expect(
      needsUnoptimizedImage({
        status: ContentStatus.APPROVED,
        isPublic: false,
      }),
    ).toBe(true);
  });

  it("lässt fehlende Medien in Ruhe", () => {
    expect(needsUnoptimizedImage(null)).toBe(false);
  });
});
