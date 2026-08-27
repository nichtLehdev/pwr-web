import { describe, expect, it } from "@jest/globals";
import { ContentStatus } from "~/generated/prisma/client";
import { authorMayChangeStatus } from "../content-status";

const { DRAFT, PENDING, APPROVED, REJECTED } = ContentStatus;

describe("authorMayChangeStatus", () => {
  it("allows submitting a draft for review", () => {
    expect(authorMayChangeStatus(DRAFT, PENDING)).toBe(true);
  });

  it("allows re-submitting after a rejection", () => {
    expect(authorMayChangeStatus(REJECTED, PENDING)).toBe(true);
    expect(authorMayChangeStatus(REJECTED, DRAFT)).toBe(true);
  });

  // The forms submit the current status back unchanged on every save.
  it("allows a no-op", () => {
    for (const status of [DRAFT, PENDING, APPROVED, REJECTED]) {
      expect(authorMayChangeStatus(status, status)).toBe(true);
    }
  });

  // The regression this closes: bulkStatusChange let an author select their own
  // pending posts and publish them without any review.
  it("refuses self-approval", () => {
    expect(authorMayChangeStatus(DRAFT, APPROVED)).toBe(false);
    expect(authorMayChangeStatus(PENDING, APPROVED)).toBe(false);
    expect(authorMayChangeStatus(REJECTED, APPROVED)).toBe(false);
  });

  it("refuses self-rejection", () => {
    expect(authorMayChangeStatus(PENDING, REJECTED)).toBe(false);
  });

  // Pulling something already public back out of review is a redaction call:
  // the item is live and readers have it.
  it("refuses unpublishing", () => {
    expect(authorMayChangeStatus(APPROVED, DRAFT)).toBe(false);
    expect(authorMayChangeStatus(APPROVED, PENDING)).toBe(false);
  });
});
