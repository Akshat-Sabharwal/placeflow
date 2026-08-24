import { PageHeader } from "@/components/page-header";
import { ProfileGraph } from "@/components/profile-graph";

export default function StudentPeoplePage() {
  return <><PageHeader eyebrow="Public network" title="People, connected by context" description="Explore public student and coordinator profiles through the public groups they share." /><ProfileGraph /></>;
}
