import type { ApiErrorBody as ContractErrorBody } from "@/lib/contracts/api";

export type ApiErrorBody = Partial<ContractErrorBody> & { error?: Partial<ContractErrorBody["error"]> };

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;

  constructor(status: number, body?: ApiErrorBody) {
    super(body?.error?.message ?? "Something went wrong. Please try again.");
    this.name = "ApiError";
    this.status = status;
    this.code = body?.error?.code ?? "INTERNAL_ERROR";
    this.details = body?.error?.details ?? {};
  }
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
