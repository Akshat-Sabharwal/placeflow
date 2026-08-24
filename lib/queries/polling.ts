export const polling = { drives: 15_000, drive: 15_000, applications: 10_000, applicants: 5_000, notifications: 30_000 } as const;

export function whenVisible(interval: number) {
  return () => typeof document === "undefined" || document.visibilityState === "visible" ? interval : false;
}
