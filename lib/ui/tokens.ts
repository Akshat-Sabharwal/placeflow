export const colors = {
  paper: "var(--paper)", paperDeep: "var(--paper-deep)", surface: "var(--surface)", surfaceStrong: "var(--surface-strong)", header: "var(--header)", ink: "var(--ink)", muted: "var(--ink-soft)", line: "var(--line)", lineStrong: "var(--line-strong)", focus: "var(--focus)",
  signal: "var(--signal)", signalDark: "var(--signal-hover)", signalText: "var(--signal-text)", signalSoft: "var(--signal-soft)", onSignal: "var(--on-signal)", neutralSolid: "var(--neutral-solid)", neutralSolidHover: "var(--neutral-solid-hover)", onNeutral: "var(--on-neutral)", headerControl: "var(--header-control)", headerControlHover: "var(--header-control-hover)", onHeaderControl: "var(--on-header-control)", linkHover: "var(--link-hover)", controlBg: "var(--control-bg)", overlay: "var(--overlay)", success: "var(--success)", successSoft: "var(--success-soft)",
  warning: "var(--warning)", warningSoft: "var(--warning-soft)", danger: "var(--danger)", dangerSoft: "var(--danger-soft)", info: "var(--info)", infoSoft: "var(--info-soft)",
} as const;

export const statusTone = {
  draft: "neutral", published: "success", registration_closed: "warning", ongoing: "info", completed: "neutral", cancelled: "danger",
  applied: "info", shortlisted: "warning", selected: "success", rejected: "danger",
} as const;
