import { ApiError, type ApiErrorBody } from "./errors";

type SuccessEnvelope<T> = { data: T };
export type CollectionEnvelope<T> = { data: T[]; meta?: { nextCursor?: string | null } };

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers }, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as SuccessEnvelope<T> | ApiErrorBody;
  if (!response.ok || !("data" in body)) throw new ApiError(response.status, body as ApiErrorBody);
  return body.data;
}

export async function apiCollection<T>(path: string, init?: RequestInit): Promise<CollectionEnvelope<T>> {
  const response = await fetch(path, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({})) as CollectionEnvelope<T> | ApiErrorBody;
  if (!response.ok || !("data" in body)) throw new ApiError(response.status, body as ApiErrorBody);
  return body;
}
