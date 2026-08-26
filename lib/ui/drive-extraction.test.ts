import { describe, expect, it } from "vitest";
import { extractDriveFields } from "./drive-extraction";

describe("extractDriveFields", () => {
  it("extracts labelled drive fields and rounds without treating dates as graduation years", () => {
    const result = extractDriveFields(`
Company: Acme Systems
Role: Graduate Engineer
Location: Bengaluru
Package: 12 LPA
Eligible branches: CSE, IT
Eligible years: 2027, 2028
Minimum CGPA: 7.5
Maximum backlogs: 1
Registration deadline: 30 September 2026
Drive date: 10 October 2026
Round 1: Aptitude test - online assessment
Round 2: Technical interview
`);
    expect(result).toMatchObject({
      companyName: "Acme Systems",
      jobRole: "Graduate Engineer",
      eligibleBranches: ["CSE", "IT"],
      eligibleYears: [2027, 2028],
      minimumCgpa: 7.5,
      maximumBacklogs: 1,
    });
    expect(result.rounds).toEqual([
      { name: "Aptitude test", description: "online assessment" },
      { name: "Technical interview", description: null },
    ]);
  });

  it("detects rounds when PDF text extraction flattens lines", () => {
    const result = extractDriveFields("Company: Acme Role: Engineer Round 1: Aptitude test Round 2: Technical interview");
    expect(result.rounds).toEqual([
      { name: "Aptitude test", description: null },
      { name: "Technical interview", description: null },
    ]);
  });
});
