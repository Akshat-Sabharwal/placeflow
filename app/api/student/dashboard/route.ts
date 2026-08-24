import type {
  ApplicationDTO,
  DriveDTO,
  StudentDashboardDTO,
} from "@/lib/contracts/domain";
import { authorizeRequest } from "@/lib/auth";
import { evaluateEligibility } from "@/lib/domain/eligibility";
import {
  apiData,
  handleRoute,
  PRIVATE_NO_STORE_HEADERS,
  RouteError,
} from "@/lib/server/http";
import { toApplicationDTO, toDriveDTO, toProfileDTO } from "@/lib/server/dto";

export async function GET() {
  return handleRoute(async () => {
    const viewer = await authorizeRequest("student");
    const [profileResult, drivesResult, applicationsResult] = await Promise.all([
      viewer.supabase.from("profiles").select("*").eq("id", viewer.userId).single(),
      viewer.supabase
        .from("drives")
        .select("*")
        .order("registration_deadline")
        .limit(50),
      viewer.supabase
        .from("applications")
        .select("*")
        .eq("student_id", viewer.userId)
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    if (profileResult.error || !profileResult.data) {
      throw new RouteError(404, "NOT_FOUND", "Your profile could not be found.");
    }
    if (drivesResult.error) throw new Error(drivesResult.error.message);
    if (applicationsResult.error) throw new Error(applicationsResult.error.message);

    const profile = toProfileDTO(profileResult.data);
    const applicationRows = applicationsResult.data ?? [];
    const appliedDriveIds = new Set(applicationRows.map((row) => row.drive_id));
    const drives: DriveDTO[] = (drivesResult.data ?? []).map((row) => {
      const drive = toDriveDTO(row);
      drive.eligibility = evaluateEligibility(
        {
          onboardingCompletedAt: profile.onboardingCompletedAt,
          branch: profile.branch,
          graduationYear: profile.graduationYear,
          cgpa: profile.cgpa,
          backlogs: profile.backlogs,
        },
        {
          status: drive.status,
          registrationDeadline: drive.registrationDeadline,
          eligibleBranches: drive.eligibleBranches,
          eligibleYears: drive.eligibleYears,
          minimumCgpa: drive.minimumCgpa,
          maximumBacklogs: drive.maximumBacklogs,
        },
      );
      drive.alreadyApplied = appliedDriveIds.has(drive.id);
      return drive;
    });

    const driveById = new Map(drives.map((drive) => [drive.id, drive]));
    const applications: ApplicationDTO[] = applicationRows.map((row) => {
      const application = toApplicationDTO(row);
      const drive = driveById.get(row.drive_id);
      if (drive) {
        application.companyName = drive.companyName;
        application.jobRole = drive.jobRole;
        application.driveDate = drive.driveDate;
      }
      return application;
    });

    const data: StudentDashboardDTO = {
      viewer: {
        userId: viewer.userId,
        email: viewer.email,
        role: viewer.role,
      },
      profile,
      drives,
      applications,
    };
    return apiData(data, { headers: PRIVATE_NO_STORE_HEADERS });
  });
}
