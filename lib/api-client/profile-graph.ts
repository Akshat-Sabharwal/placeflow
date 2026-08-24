import type { ProfileGraphDTO } from "@/lib/contracts/domain";
import { apiRequest } from "./client";

export const getProfileGraph = () => apiRequest<ProfileGraphDTO>("/api/profiles/graph");
