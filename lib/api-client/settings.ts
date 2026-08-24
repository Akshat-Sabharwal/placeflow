import type { SettingsDTO } from "@/lib/contracts/domain";
import { apiRequest } from "./client";

export const getSettings = () => apiRequest<SettingsDTO>("/api/settings");
export const updateSettings = (input: SettingsDTO) => apiRequest<SettingsDTO>("/api/settings", { method: "PATCH", body: JSON.stringify(input) });
