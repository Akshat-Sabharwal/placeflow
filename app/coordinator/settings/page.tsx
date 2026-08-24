import { PageHeader } from "@/components/page-header";
import { SettingsPanel } from "@/components/settings-panel";

export default function CoordinatorSettingsPage() {
  return <><PageHeader eyebrow="Preferences" title="Settings" description="Control your theme, public-profile discovery, and group defaults." /><SettingsPanel /></>;
}
