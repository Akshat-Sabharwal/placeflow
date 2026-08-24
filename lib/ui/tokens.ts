export const colors = {
  paper: "var(--paper)", paperDeep: "var(--paper-deep)", surface: "var(--surface)", surfaceStrong: "var(--surface-strong)", header: "var(--header)", ink: "var(--ink)", muted: "var(--ink-soft)", line: "var(--line)", lineStrong: "var(--line-strong)", focus: "var(--focus)",
  signal: "var(--signal)", signalDark: "var(--signal-hover)", signalSoft: "var(--signal-soft)", success: "var(--success)", successSoft: "var(--success-soft)",
  warning: "var(--warning)", warningSoft: "var(--warning-soft)", danger: "var(--danger)", dangerSoft: "var(--danger-soft)", info: "var(--info)", infoSoft: "var(--info-soft)",
} as const;

export const statusTone = {
  draft: "neutral", published: "success", registration_closed: "warning", ongoing: "info", completed: "neutral", cancelled: "danger",
  applied: "info", shortlisted: "warning", selected: "success", rejected: "danger",
} as const;
