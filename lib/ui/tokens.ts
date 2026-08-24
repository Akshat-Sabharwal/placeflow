export const colors = {
  paper: "#F4F0E8", paperDeep: "#EBE5DA", ink: "#171817", muted: "#66645F", line: "#D8D2C8",
  signal: "#F4512C", signalDark: "#C6381B", signalSoft: "#FFD6CC", success: "#167452", successSoft: "#DDF3E9",
  warning: "#95620A", warningSoft: "#FFF0C7", danger: "#B42318", dangerSoft: "#FDE4E1", info: "#2759B4", infoSoft: "#E2ECFF",
} as const;

export const statusTone = {
  draft: "neutral", published: "success", registration_closed: "warning", ongoing: "info", completed: "neutral", cancelled: "danger",
  applied: "info", shortlisted: "warning", selected: "success", rejected: "danger",
} as const;
