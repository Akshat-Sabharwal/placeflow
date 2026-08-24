import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { StudentDrives } from "@/components/student-drives";
import { PageSkeleton } from "@/components/async-state";

export default function StudentDrivesPage() {
  return <><PageHeader eyebrow="Discover" title="Placement drives" description="See open opportunities, understand your eligibility, and apply with a private resume." /><Suspense fallback={<PageSkeleton rows={4} />}><StudentDrives /></Suspense></>;
}
