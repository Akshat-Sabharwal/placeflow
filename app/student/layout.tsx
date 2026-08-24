import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { requireStudent } from "@/lib/auth";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  await requireStudent();
  return <AppShell role="student">{children}</AppShell>;
}
