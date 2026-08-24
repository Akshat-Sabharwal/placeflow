import { describe, expect, it } from "vitest";
import { queryKeys } from "./keys";
import { polling, whenVisible } from "./polling";

describe("client query contracts", () => {
  it("keeps the canonical query key spellings", () => {
    expect(queryKeys.viewer).toEqual(["viewer"]);
    expect(queryKeys.profile).toEqual(["profile"]);
    expect(queryKeys.drives({ status: "open" })).toEqual(["drives", { status: "open" }]);
    expect(queryKeys.myApplications()).toEqual(["applications", "me", {}]);
    expect(queryKeys.driveApplications("drive-1")).toEqual(["drive-applications", "drive-1", {}]);
    expect(queryKeys.documents).toEqual(["documents"]);
  });

  it("uses the specified foreground polling intervals", () => {
    expect(polling.drives).toBe(60_000);
    expect(polling.drive).toBe(30_000);
    expect(polling.applications).toBe(30_000);
    expect(polling.applicants).toBe(15_000);
    expect(polling.notifications).toBe(60_000);
    expect(whenVisible(polling.drives)()).toBe(polling.drives);
  });
});
