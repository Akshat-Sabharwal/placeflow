import "server-only";

import PDFDocument from "pdfkit";
import type { ApplicantDTO, DriveDTO } from "@/lib/contracts/domain";

export async function createApplicantReport(drive: Pick<DriveDTO, "companyName" | "jobRole">, applicants: ApplicantDTO[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 42, info: { Title: `Applicant report - ${drive.companyName} ${drive.jobRole}` } });
    const chunks: Buffer[] = [];
    pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    pdf.fontSize(20).fillColor("#171817").text("PlaceFlow applicant report");
    pdf.moveDown(0.3).fontSize(13).text(`${drive.companyName} — ${drive.jobRole}`);
    pdf.moveDown(0.3).fontSize(9).fillColor("#5f625e").text(`Generated ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · ${applicants.length} applicant${applicants.length === 1 ? "" : "s"}`);
    pdf.moveDown(1);

    for (const applicant of applicants) {
      if (pdf.y > 720) pdf.addPage();
      pdf.roundedRect(42, pdf.y, 511, 72, 6).strokeColor("#cfcbc0").stroke();
      const top = pdf.y + 10;
      pdf.fontSize(11).fillColor("#171817").text(applicant.fullName ?? "Profile incomplete", 54, top, { width: 210 });
      pdf.fontSize(8).fillColor("#5f625e").text(`${applicant.rollNumber ?? "No roll number"} · ${applicant.branch ?? "No branch"} · ${applicant.graduationYear ?? "No year"}`, 54, top + 18, { width: 230 });
      pdf.text(`CGPA ${applicant.cgpa ?? "—"} · Backlogs ${applicant.backlogs ?? "—"}`, 54, top + 34);
      pdf.fontSize(9).fillColor("#171817").text(`Application: ${applicant.applicationStatus}`, 330, top, { width: 205 });
      pdf.text(`Candidate: ${applicant.candidateResponse}`, 330, top + 18, { width: 205 });
      pdf.fillColor("#5f625e").text(`Applied: ${new Date(applicant.appliedAt).toLocaleDateString("en-IN")}`, 330, top + 36, { width: 205 });
      pdf.y = top + 72;
    }
    pdf.end();
  });
}
