import { describe, expect, it } from "@jest/globals";
import type { DistrictScope } from "@/lib/district-scope";
import { deletionRequestAccess } from "@/lib/deletion-request";

const koeln: DistrictScope = { unrestricted: false, bezirkIds: ["koeln"] };
const base = {
  isOwner: false,
  hasDeletePermission: false,
  hasViewPermission: true,
  scope: koeln,
  bezirkId: "koeln" as string | null,
};

describe("deletionRequestAccess", () => {
  it("lets Obleute request deletion of someone else's content in their Bezirk", () => {
    expect(deletionRequestAccess(base)).toEqual({
      canDelete: false,
      canRequest: true,
    });
  });

  it("offers no request to whoever can delete directly", () => {
    expect(deletionRequestAccess({ ...base, isOwner: true })).toEqual({
      canDelete: true,
      canRequest: false,
    });
    expect(
      deletionRequestAccess({ ...base, hasDeletePermission: true }),
    ).toEqual({ canDelete: true, canRequest: false });
  });

  it("refuses content from another Bezirk or without Bezirk", () => {
    expect(
      deletionRequestAccess({ ...base, bezirkId: "duesseldorf" }).canRequest,
    ).toBe(false);
    expect(deletionRequestAccess({ ...base, bezirkId: null }).canRequest).toBe(
      false,
    );
  });

  it("requires the view permission", () => {
    expect(
      deletionRequestAccess({ ...base, hasViewPermission: false }).canRequest,
    ).toBe(false);
  });

  it("lets reviewers without delete right request anywhere", () => {
    expect(
      deletionRequestAccess({
        ...base,
        scope: { unrestricted: true },
        bezirkId: null,
      }).canRequest,
    ).toBe(true);
  });
});
