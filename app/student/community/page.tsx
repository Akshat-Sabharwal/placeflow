import { PageHeader } from "@/components/page-header";
import { CommunityHub } from "@/components/community-hub";
import { requireStudent } from "@/lib/auth";

export default async function StudentCommunityPage() {
  const viewer = await requireStudent();
  const { data } = await viewer.supabase.from("profiles").select("default_group_visibility").eq("id", viewer.userId).single();
  return <><PageHeader eyebrow="Community" title="Groups for real conversations" description="Public groups are open to everyone. Private groups keep messages behind owner approval." /><CommunityHub role="student" defaultVisibility={data?.default_group_visibility ?? "public"} /></>;
}
