import type { ApplicantDTO } from "@/lib/contracts/domain";
import { uuidSchema } from "@/lib/contracts/schemas";
import { authorizeRequest } from "@/lib/auth";
import { handleRoute, RouteError } from "@/lib/server/http";
import { createApplicantReport } from "@/lib/server/applicant-report";
import { createAdminClient } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return handleRoute(async () => {
    const viewer = await authorizeRequest("coordinator");
    const { id } = await context.params;
    if (!uuidSchema.safeParse(id).success) throw new RouteError(400, "VALIDATION_ERROR", "Invalid drive id.");
    const admin = createAdminClient();
    const { data: drive } = await admin.from("drives").select("id,company_name,job_role").eq("id", id).eq("created_by", viewer.userId).maybeSingle();
    if (!drive) throw new RouteError(404, "NOT_FOUND", "Drive not found.");
    const { data: applications, error } = await admin.from("applications").select("*").eq("drive_id", id).order("applied_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    const studentIds = [...new Set((applications ?? []).map((item) => item.student_id))];
    const { data: profiles } = studentIds.length
      ? await admin.from("profiles").select("id,full_name,roll_number,branch,graduation_year,cgpa,backlogs,active_profile_document_id").in("id", studentIds)
      : { data: [] };
    const byId = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const applicants: ApplicantDTO[] = (applications ?? []).map((application) => {
      const profile = byId.get(application.student_id);
      return {
        applicationId: application.id,
        studentId: application.student_id,
        fullName: profile?.full_name ?? null,
        rollNumber: profile?.roll_number ?? null,
        branch: profile?.branch ?? null,
        graduationYear: profile?.graduation_year ?? null,
        cgpa: profile?.cgpa ?? null,
        backlogs: profile?.backlogs ?? null,
        applicationStatus: application.status,
        candidateResponse: application.candidate_response,
        candidateRespondedAt: application.candidate_responded_at,
        resumeDocumentId: application.resume_document_id,
        activeProfileDocumentId: profile?.active_profile_document_id ?? null,
        appliedAt: application.applied_at,
        updatedAt: application.updated_at,
      };
    });
    const requestedOutcome = new URL(request.url).searchParams.get("outcome") ?? "all";
    if (!["all", "accepted", "rejected", "in_progress"].includes(requestedOutcome)) {
      throw new RouteError(400, "VALIDATION_ERROR", "Invalid applicant outcome filter.");
    }
    const reportApplicants = applicants.filter((applicant) => {
      if (requestedOutcome === "all") return true;
      if (requestedOutcome === "accepted") return applicant.applicationStatus === "selected" || applicant.candidateResponse === "accepted";
      if (requestedOutcome === "rejected") return applicant.applicationStatus === "rejected" || applicant.candidateResponse === "declined";
      return applicant.applicationStatus !== "rejected"
        && applicant.applicationStatus !== "selected"
        && applicant.candidateResponse !== "accepted"
        && applicant.candidateResponse !== "declined";
    });
    const body = await createApplicantReport(
      { companyName: drive.company_name, jobRole: drive.job_role },
      reportApplicants,
    );
    const filenameBase = `${drive.company_name}-${drive.job_role}-${requestedOutcome}-applicants`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
}
