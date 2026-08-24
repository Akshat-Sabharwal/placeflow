import { describe, expect, it } from "vitest";
import { MAX_PDF_BYTES, validatePdf } from "./files";

describe("validatePdf", () => {
  it("accepts a non-empty PDF up to 10 MiB", () => {
    expect(validatePdf({ name: "resume.pdf", type: "application/pdf", size: MAX_PDF_BYTES })).toBeNull();
  });

  it("rejects non-PDF, oversized, and empty files with specific feedback", () => {
    expect(validatePdf({ name: "resume.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 500 })).toBe("Choose a PDF file.");
    expect(validatePdf({ name: "resume.pdf", type: "application/pdf", size: MAX_PDF_BYTES + 1 })).toBe("This PDF is larger than 10 MiB.");
    expect(validatePdf({ name: "resume.pdf", type: "application/pdf", size: 0 })).toBe("This file is empty.");
  });
});
