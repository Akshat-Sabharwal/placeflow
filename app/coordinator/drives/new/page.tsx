import { DriveForm } from "@/components/drive-form";
import { PageHeader } from "@/components/page-header";

export default function NewDrivePage() {
  return <><PageHeader eyebrow="Coordinator" title="Create a drive" description="Set the role, eligibility rules, and schedule. Save privately as a draft or publish when ready." /><DriveForm /></>;
}
