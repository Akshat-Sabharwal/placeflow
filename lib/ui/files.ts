export const MAX_DOCUMENT_BYTES = 50 * 1024 * 1024;
export const DOCUMENT_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "webp", "txt", "csv", "rtf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"] as const;
export const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",");

export const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv", "application/rtf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export function fileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", txt: "text/plain", csv: "text/csv", rtf: "application/rtf",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint", pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

export function documentMimeType(file: Pick<File, "name" | "type">) {
  return DOCUMENT_MIME_TYPES.has(file.type) ? file.type : mimeByExtension[fileExtension(file.name)] ?? file.type;
}

export function validateDocument(file: Pick<File, "name" | "size" | "type">): string | null {
  const extension = fileExtension(file.name);
  if (!DOCUMENT_EXTENSIONS.includes(extension as (typeof DOCUMENT_EXTENSIONS)[number]) || (file.type && !DOCUMENT_MIME_TYPES.has(file.type))) return "Choose a supported document file.";
  if (file.size > MAX_DOCUMENT_BYTES) return "This document is larger than 50 MiB.";
  if (file.size === 0) return "This file is empty.";
  return null;
}

export function canPreviewDocument(mimeType: string) {
  return mimeType === "application/pdf" || mimeType.startsWith("image/") || mimeType.startsWith("text/");
}

export const MAX_PDF_BYTES = MAX_DOCUMENT_BYTES;

export function validatePdf(file: Pick<File, "name" | "size" | "type">): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return "Choose a PDF file.";
  if (file.size > MAX_PDF_BYTES) return "This PDF is larger than 50 MiB.";
  if (file.size === 0) return "This file is empty.";
  return null;
}
