import type { DocumentDTO, DocumentType, SignedDocumentUrlDTO } from "@/lib/contracts/domain";
import { apiCollection, apiRequest } from "./client";

export type DocumentMetadataInput = { storagePath: string; originalName: string; mimeType: "application/pdf"; sizeBytes: number; type: DocumentType };
export const getDocuments = async () => (await apiCollection<DocumentDTO>("/api/documents")).data;
export const recordDocument = (input: DocumentMetadataInput) => apiRequest<DocumentDTO>("/api/documents/metadata", { method: "POST", body: JSON.stringify(input) });
export const deleteDocument = (id: string) => apiRequest<{ id: string }>(`/api/documents/${id}`, { method: "DELETE" });
export const getDocumentUrl = (id: string) => apiRequest<SignedDocumentUrlDTO>(`/api/documents/${id}/url`);
