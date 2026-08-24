import { CommunityRoom } from "@/components/community-room";

export default async function StudentCommunityRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityRoom id={id} role="student" />;
}
