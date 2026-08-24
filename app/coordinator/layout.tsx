import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireCoordinator } from "@/lib/auth";

export default async function CoordinatorLayout({ children }: { children: ReactNode }) {
  await requireCoordinator();
  return <AppShell role="coordinator">{children}</AppShell>;
}
