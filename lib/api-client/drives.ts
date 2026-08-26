import type { DriveDTO } from "@/lib/contracts/domain";
import type { z } from "zod";
import { createDriveSchema, updateDriveSchema } from "@/lib/contracts/schemas";
import { apiCollection, apiRequest } from "./client";

export type CreateDriveInput = z.input<typeof createDriveSchema>;
export type UpdateDriveInput = z.input<typeof updateDriveSchema>;
export const getDrives = async (status?: string) => (await apiCollection<DriveDTO>(`/api/drives${status ? `?status=${encodeURIComponent(status)}` : ""}`)).data;
export const getDrive = (id: string) => apiRequest<DriveDTO>(`/api/drives/${id}`);
export const createDrive = (input: CreateDriveInput) => apiRequest<DriveDTO>("/api/drives", { method: "POST", body: JSON.stringify(input) });
export const updateDrive = (id: string, input: UpdateDriveInput) => apiRequest<DriveDTO>(`/api/drives/${id}`, { method: "PATCH", body: JSON.stringify(input) });
export const setDrivePinned = (id: string, pinned: boolean) =>
  apiRequest<{ pinned: boolean }>(`/api/drives/${id}/pin`, { method: pinned ? "POST" : "DELETE" });
