import { describe, expect, it } from "vitest";
import { canPreviewDocument, documentMimeType, MAX_DOCUMENT_BYTES, MAX_PDF_BYTES, validateDocument, validatePdf } from "./files";

describe("validatePdf", () => {
  it("accepts a non-empty PDF up to 50 MiB", () => {
    expect(validatePdf({ name: "resume.pdf", type: "application/pdf", size: MAX_PDF_BYTES })).toBeNull();
  });

  it("rejects non-PDF, oversized, and empty files with specific feedback", () => {
    expect(validatePdf({ name: "resume.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 500 })).toBe("Choose a PDF file.");
    expect(validatePdf({ name: "resume.pdf", type: "application/pdf", size: MAX_PDF_BYTES + 1 })).toBe("This PDF is larger than 50 MiB.");
    expect(validatePdf({ name: "resume.pdf", type: "application/pdf", size: 0 })).toBe("This file is empty.");
  });
});

describe("validateDocument", () => {
  it.each([
    ["report.pdf", "application/pdf"],
    ["photo.PNG", "image/png"],
    ["notes.txt", "text/plain"],
    ["scores.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["slides.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ])("accepts supported %s documents", (name, type) => {
    expect(validateDocument({ name, type, size: 400 })).toBeNull();
  });

  it("rejects mismatched, unknown, empty, and oversized documents", () => {
    expect(validateDocument({ name: "malware.exe", type: "application/octet-stream", size: 10 })).toBe("Choose a supported document file.");
    expect(validateDocument({ name: "fake.pdf", type: "application/zip", size: 10 })).toBe("Choose a supported document file.");
    expect(validateDocument({ name: "empty.txt", type: "text/plain", size: 0 })).toBe("This file is empty.");
    expect(validateDocument({ name: "large.pdf", type: "application/pdf", size: MAX_DOCUMENT_BYTES + 1 })).toBe("This document is larger than 50 MiB.");
  });

  it("infers office MIME types when browsers omit them", () => {
    expect(documentMimeType({ name: "resume.docx", type: "" })).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(documentMimeType({ name: "table.csv", type: "" })).toBe("text/csv");
  });

  it.each([
    ["application/pdf", true], ["image/webp", true], ["text/csv", true], ["application/msword", false],
  ])("classifies %s preview support", (mime, supported) => {
    expect(canPreviewDocument(mime)).toBe(supported);
  });
});
