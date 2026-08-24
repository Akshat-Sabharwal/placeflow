import { PageHeader } from "@/components/page-header";
import { CommunityHub } from "@/components/community-hub";
import { requireCoordinator } from "@/lib/auth";

export default async function CoordinatorCommunityPage() {
  const viewer = await requireCoordinator();
  const { data } = await viewer.supabase.from("profiles").select("default_group_visibility").eq("id", viewer.userId).single();
  return <><PageHeader eyebrow="Community" title="Groups for real conversations" description="Create open campus discussions or approval-controlled private rooms for focused cohorts." /><CommunityHub role="coordinator" defaultVisibility={data?.default_group_visibility ?? "public"} /></>;
}
