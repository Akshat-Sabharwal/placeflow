export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function validatePdf(file: Pick<File, "name" | "size" | "type">): string | null {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return "Choose a PDF file.";
  if (file.size > MAX_PDF_BYTES) return "This PDF is larger than 10 MiB.";
  if (file.size === 0) return "This file is empty.";
  return null;
}
