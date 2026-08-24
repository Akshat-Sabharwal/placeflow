export const queryKeys = {
  viewer: ["viewer"] as const,
  studentDashboard: ["student-dashboard"] as const,
  profile: ["profile"] as const,
  drives: (filters: Record<string, unknown> = {}) => ["drives", filters] as const,
  drive: (id: string) => ["drive", id] as const,
  myApplications: (filters: Record<string, unknown> = {}) => ["applications", "me", filters] as const,
  driveApplications: (id: string, filters: Record<string, unknown> = {}) => ["drive-applications", id, filters] as const,
  documents: ["documents"] as const,
  notifications: (filters: Record<string, unknown> = {}) => ["notifications", filters] as const,
};
