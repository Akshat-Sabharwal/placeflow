import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings-panel";

export default function StudentSettingsPage() {
  return <><PageHeader eyebrow="Preferences" title="Settings" description="Control your theme, profile discovery, and how group membership appears across PlaceFlow." /><SettingsPanel /></>;
}
