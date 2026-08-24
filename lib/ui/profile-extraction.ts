import { BRANCH_SUGGESTIONS } from "@/lib/contracts/branches";

export type ExtractedProfile = {
  fullName?: string;
  rollNumber?: string;
  branch?: string;
  graduationYear?: number;
  cgpa?: number;
  backlogs?: number;
  linkedinUrl?: string;
  githubUrl?: string;
};

function matchValue(text: string, pattern: RegExp) {
  return text.match(pattern)?.[1]?.trim();
}

export function extractProfileFields(text: string): ExtractedProfile {
  const normalized = text.replace(/\r/g, "\n").replace(/[ \t]+/g, " ");
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const nextLabel = String.raw`(?=\s+(?:roll(?:\s*(?:no|number))?|registration\s*(?:no|number)|student\s*id|branch|department|programme|program|graduation\s*year|year\s*of\s*graduation|batch|class\s*of|cgpa|cumulative\s*gpa|gpa|(?:active\s*)?backlogs?|https?:\/\/)|\n|$)`;
  const labelledName = matchValue(normalized, new RegExp(String.raw`(?:full\s*name|student\s*name|name)\s*[:\-]\s*([A-Za-z][A-Za-z .'-]{2,80}?)${nextLabel}`, "i"));
  const likelyName = lines.find((line) => /^[A-Za-z][A-Za-z .'-]{2,80}$/.test(line) && line.trim().split(/\s+/).length >= 2);
  const rollNumber = matchValue(normalized, /(?:roll(?:\s*(?:no|number))?|registration\s*(?:no|number)|student\s*id)\s*[:#\-]?\s*([A-Z0-9][A-Z0-9\/-]{2,31})/i);
  const labelledBranch = matchValue(normalized, new RegExp(String.raw`(?:branch|department|programme|program)\s*[:\-]\s*([A-Za-z &.-]{2,64}?)${nextLabel}`, "i"));
  const knownBranch = BRANCH_SUGGESTIONS.find((branch) => new RegExp(`\\b${branch}\\b`, "i").test(normalized));
  const yearRaw = matchValue(normalized, /(?:graduation\s*year|year\s*of\s*graduation|batch|class\s*of)\s*[:\-]?\s*(20\d{2})\b/i);
  const cgpaRaw = matchValue(normalized, /(?:cgpa|cumulative\s*gpa|gpa)\s*(?:\/\s*10)?\s*[:\-]?\s*(\d+(?:\.\d{1,2})?)\b/i);
  const backlogsRaw = matchValue(normalized, /(?:active\s*)?backlogs?\s*[:\-]?\s*(\d+)\b/i);
  const linkedInUrl = normalized.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0];
  const githubUrl = normalized.match(/https?:\/\/(?:www\.)?github\.com\/[^\s)]+/i)?.[0];
  const graduationYear = yearRaw ? Number(yearRaw) : undefined;
  const cgpa = cgpaRaw ? Number(cgpaRaw) : undefined;
  const backlogs = backlogsRaw ? Number(backlogsRaw) : undefined;

  return {
    fullName: labelledName ?? likelyName,
    rollNumber,
    branch: labelledBranch?.trim().toUpperCase() ?? knownBranch,
    graduationYear: graduationYear && graduationYear >= 2000 && graduationYear <= 2100 ? graduationYear : undefined,
    cgpa: cgpa !== undefined && cgpa >= 0 && cgpa <= 10 ? cgpa : undefined,
    backlogs: backlogs !== undefined && backlogs >= 0 && backlogs <= 99 ? backlogs : undefined,
    linkedinUrl: linkedInUrl,
    githubUrl,
  };
}
