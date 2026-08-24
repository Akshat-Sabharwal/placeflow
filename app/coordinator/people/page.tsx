import { PageHeader } from "@/components/page-header";
import { ProfileGraph } from "@/components/profile-graph";

export default function CoordinatorPeoplePage() {
  return <><PageHeader eyebrow="Public network" title="People, connected by context" description="See public profiles and the public communities that relate them." /><ProfileGraph /></>;
}
