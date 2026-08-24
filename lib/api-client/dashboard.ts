import type { StudentDashboardDTO } from "@/lib/contracts/domain";
import { apiRequest } from "./client";

export const getStudentDashboard = () =>
  apiRequest<StudentDashboardDTO>("/api/student/dashboard");
