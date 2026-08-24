export const polling = {
  drives: 60_000,
  drive: 30_000,
  applications: 30_000,
  applicants: 15_000,
  notifications: 60_000,
} as const;

export function whenVisible(interval: number) {
  return () => typeof document === "undefined" || document.visibilityState === "visible" ? interval : false;
}
