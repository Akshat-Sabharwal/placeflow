import { describe, expect, it } from "vitest";
import { extractProfileFields } from "./profile-extraction";

describe("extractProfileFields", () => {
  it("extracts labelled placement fields for manual confirmation", () => {
    expect(extractProfileFields(`Full Name: Ada Lovelace\nRoll Number: CSE-2027-014\nBranch: CSE\nGraduation Year: 2027\nCGPA: 9.2\nBacklogs: 0\nhttps://github.com/ada`)).toMatchObject({
      fullName: "Ada Lovelace", rollNumber: "CSE-2027-014", branch: "CSE", graduationYear: 2027, cgpa: 9.2, backlogs: 0, githubUrl: "https://github.com/ada",
    });
  });

  it("does not invent invalid numeric values", () => {
    expect(extractProfileFields("Name: Test Student\nCGPA: 14\nBacklogs: 120")).toMatchObject({ fullName: "Test Student", cgpa: undefined, backlogs: undefined });
  });

  it("stops text-based PDF fields at the next flattened label", () => {
    expect(extractProfileFields("Full Name: Test Student Roll Number: PF-2027-01 Branch: CSE Graduation Year: 2027 CGPA: 8.75 Backlogs: 0")).toMatchObject({
      fullName: "Test Student",
      rollNumber: "PF-2027-01",
      branch: "CSE",
      graduationYear: 2027,
      cgpa: 8.75,
      backlogs: 0,
    });
  });
});
