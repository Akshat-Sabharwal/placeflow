import type { OnboardingProfileFieldsDTO, OnboardingRecordDTO, OnboardingSnapshotDTO, ProfileDTO } from "@/lib/contracts/domain";
import { apiRequest } from "./client";

export type CreateExtractionInput = {
  documentId: string;
  extractorName: "pdfjs-dist" | "tesseract.js" | "manual" | "hybrid";
  extractorVersion?: string;
  sourceSha256?: string;
  extractedFields: Partial<OnboardingProfileFieldsDTO>;
  fieldConfidence?: Partial<Record<keyof OnboardingProfileFieldsDTO, number>>;
};

export const getOnboarding = () => apiRequest<OnboardingSnapshotDTO>("/api/onboarding");
export const createOnboardingExtraction = (input: CreateExtractionInput) => apiRequest<OnboardingSnapshotDTO>("/api/onboarding/extractions", { method: "POST", body: JSON.stringify(input) });
export const stageOnboarding = (input: { recordId: string; extractionId: string; expectedUpdatedAt: string; fields: OnboardingProfileFieldsDTO }) => apiRequest<OnboardingRecordDTO>("/api/onboarding", { method: "PATCH", body: JSON.stringify(input) });
export const submitOnboarding = (input: { recordId: string; expectedUpdatedAt: string }) => apiRequest<ProfileDTO>("/api/onboarding/submit", { method: "POST", body: JSON.stringify(input) });
