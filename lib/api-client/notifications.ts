import type { NotificationDTO } from "@/lib/contracts/domain";
import { apiCollection, apiRequest } from "./client";

export const getNotifications = async () => (await apiCollection<NotificationDTO>("/api/notifications")).data;
export const markNotificationRead = (id: string) => apiRequest<NotificationDTO>(`/api/notifications/${id}/read`, { method: "PATCH" });
