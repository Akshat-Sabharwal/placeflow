import { apiRequest } from "./client";

export type PushSubscriptionInput = { endpoint: string; keys: { p256dh: string; auth: string } };
export const registerPushSubscription = (input: PushSubscriptionInput) => apiRequest<unknown>("/api/push/subscriptions", { method: "POST", body: JSON.stringify(input) });
export const deletePushSubscription = (endpoint: string) => apiRequest<unknown>("/api/push/subscriptions", { method: "DELETE", body: JSON.stringify({ endpoint }) });
