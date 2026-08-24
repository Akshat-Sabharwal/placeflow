import type { ProfileDTO, ProfileResponseDTO } from "@/lib/contracts/domain";
import type { z } from "zod";
import { updateProfileSchema } from "@/lib/contracts/schemas";
import { apiRequest } from "./client";

export type UpdateProfileInput = z.input<typeof updateProfileSchema>;
export const getProfile = () => apiRequest<ProfileResponseDTO>("/api/profile");
export const updateProfile = (input: UpdateProfileInput) => apiRequest<ProfileDTO>("/api/profile", { method: "PATCH", body: JSON.stringify(input) });
