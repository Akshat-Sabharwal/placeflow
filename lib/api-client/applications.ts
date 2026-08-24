import type { ApplicantDTO, ApplicationDTO, ApplicationStatus } from "@/lib/contracts/domain";
import { apiCollection, apiRequest } from "./client";

export const applyToDrive = (driveId: string, resumeDocumentId: string) => apiRequest<ApplicationDTO>(`/api/drives/${driveId}/apply`, { method: "POST", body: JSON.stringify({ resumeDocumentId }) });
export const getMyApplications = async () => (await apiCollection<ApplicationDTO>("/api/applications/me")).data;
export const getDriveApplications = async (driveId: string) => (await apiCollection<ApplicantDTO>(`/api/drives/${driveId}/applications`)).data;
export const changeApplicationStatus = (applicationId: string, status: Exclude<ApplicationStatus, "applied">) => apiRequest<ApplicationDTO>(`/api/applications/${applicationId}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
