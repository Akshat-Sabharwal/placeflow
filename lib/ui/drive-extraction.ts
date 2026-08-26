import { BRANCH_SUGGESTIONS } from '@/lib/contracts/branches'
import type { DriveRoundDTO } from '@/lib/contracts/domain'

export type ExtractedDrive = {
  companyName?: string
  jobRole?: string
  description?: string
  location?: string
  packageText?: string
  eligibleBranches?: string[]
  eligibleYears?: number[]
  minimumCgpa?: number
  maximumBacklogs?: number
  registrationDeadline?: string
  driveDate?: string
  rounds?: DriveRoundDTO[]
}

function valueAfterLabel(text: string, labels: string) {
  return text.match(new RegExp(`(?:${labels})\\s*[:\\-]\\s*([^\\n\\r]{1,240})`, 'i'))?.[1]?.trim()
}

function labelledDate(text: string, labels: string) {
  const raw = valueAfterLabel(text, labels)
  if (!raw) return undefined
  const timestamp = Date.parse(raw)
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString()
}

export function extractDriveFields(text: string): ExtractedDrive {
  const normalized = text.replace(/\r/g, '\n').replace(/[ \t]+/g, ' ')
  const companyName = valueAfterLabel(normalized, 'company(?: name)?|organisation|organization|employer')
  const jobRole = valueAfterLabel(normalized, 'job role|role|position|designation')
  const location = valueAfterLabel(normalized, 'location|work location|job location')
  const packageText = valueAfterLabel(normalized, 'package|compensation|salary|ctc')
  const description = valueAfterLabel(normalized, 'job description|description|about the role')
  const branchLine = valueAfterLabel(normalized, 'eligible branches|branches|departments')
  const branches = branchLine
    ? branchLine.split(/[,/|]/).map((value) => value.trim().toUpperCase()).filter(Boolean)
    : BRANCH_SUGGESTIONS.filter((branch) => new RegExp(`\\b${branch}\\b`, 'i').test(normalized))
  const yearLine = valueAfterLabel(normalized, 'eligible (?:graduation )?years?|graduation years?|batch(?:es)?')
  const years = [...(yearLine ?? '').matchAll(/\b20\d{2}\b/g)]
    .map((match) => Number(match[0]))
    .filter((year) => year >= 2000 && year <= 2100)
  const minimumCgpaRaw = normalized.match(/(?:minimum|min\.?|required)\s*(?:cgpa|gpa)\s*[:>=\-]*\s*(\d+(?:\.\d{1,2})?)/i)
  const labelledCgpa = normalized.match(/(?:minimum\s*)?(?:cgpa|gpa)\s*[:>=\-]+\s*(\d+(?:\.\d{1,2})?)/i)
  const maximumBacklogsRaw = normalized.match(/(?:maximum|max\.?|allowed)\s*(?:active\s*)?backlogs?\s*[:<=\-]*\s*(\d+)/i)
    ?? normalized.match(/(?:active\s*)?backlogs?\s*[:<=\-]+\s*(\d+)/i)
  const minimumCgpa = Number(labelledCgpa?.[1] ?? minimumCgpaRaw?.[1])
  const maximumBacklogs = Number(maximumBacklogsRaw?.[1])

  const roundMatches = [...normalized.matchAll(
    /(?:^|\n|\s)(?:round|stage)\s*(?:\d+)?\s*[:.\-]\s*(.{2,180}?)(?=(?:\s+(?:round|stage)\s*\d+\s*[:.\-])|\n|$)/gi,
  )]
  const rounds: DriveRoundDTO[] = roundMatches.slice(0, 12).map((match) => {
    const [name, ...descriptionParts] = match[1].trim().split(/\s+[–—-]\s+/)
    return { name: name.trim(), description: descriptionParts.join(' - ').trim() || null }
  })

  return {
    companyName,
    jobRole,
    description,
    location,
    packageText,
    eligibleBranches: branches.length ? [...new Set(branches)] : undefined,
    eligibleYears: years.length ? [...new Set(years)].slice(0, 20) : undefined,
    minimumCgpa: Number.isFinite(minimumCgpa) && minimumCgpa >= 0 && minimumCgpa <= 10 ? minimumCgpa : undefined,
    maximumBacklogs: Number.isInteger(maximumBacklogs) && maximumBacklogs >= 0 && maximumBacklogs <= 99 ? maximumBacklogs : undefined,
    registrationDeadline: labelledDate(normalized, 'registration deadline|apply by|last date'),
    driveDate: labelledDate(normalized, 'drive date|interview date|process date'),
    rounds: rounds.length ? rounds : undefined,
  }
}
