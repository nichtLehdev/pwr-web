import { describe, expect, it } from "@jest/globals";
import { ContentStatus } from "~/generated/prisma/client";
import {
  authorMayChangeStatus,
  authorMaySaveStatus,
  statusAfterEdit,
} from "../content-status";

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

  // bulkStatusChange must not let authors publish their own posts unreviewed.
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

describe("authorMaySaveStatus", () => {
  // An edit changes what reviewers approved, so it has to go back to them.
  it("sends an edited published item back to review", () => {
    expect(authorMaySaveStatus(APPROVED, PENDING)).toBe(true);
  });

  it("allows everything authorMayChangeStatus allows", () => {
    expect(authorMaySaveStatus(DRAFT, PENDING)).toBe(true);
    expect(authorMaySaveStatus(REJECTED, DRAFT)).toBe(true);
  });

  it("still refuses approving, rejecting and unpublishing to draft", () => {
    expect(authorMaySaveStatus(PENDING, APPROVED)).toBe(false);
    expect(authorMaySaveStatus(PENDING, REJECTED)).toBe(false);
    expect(authorMaySaveStatus(APPROVED, DRAFT)).toBe(false);
  });
});

describe("statusAfterEdit", () => {
  // MCP clients send only the changed fields, so no status comes along.
  it("sends an author's edit of a published item back to review", () => {
    expect(statusAfterEdit(APPROVED, undefined, false)).toBe(PENDING);
    expect(statusAfterEdit(APPROVED, PENDING, false)).toBe(PENDING);
    expect(statusAfterEdit(APPROVED, APPROVED, false)).toBe(PENDING);
  });

  it("leaves reviewers' saves as requested", () => {
    expect(statusAfterEdit(APPROVED, undefined, true)).toBeUndefined();
    expect(statusAfterEdit(APPROVED, APPROVED, true)).toBe(APPROVED);
    expect(statusAfterEdit(PENDING, APPROVED, true)).toBe(APPROVED);
  });

  it("keeps the requested status for unpublished items", () => {
    expect(statusAfterEdit(DRAFT, undefined, false)).toBeUndefined();
    expect(statusAfterEdit(DRAFT, PENDING, false)).toBe(PENDING);
    expect(statusAfterEdit(PENDING, undefined, false)).toBeUndefined();
    expect(statusAfterEdit(REJECTED, DRAFT, false)).toBe(DRAFT);
  });
});
