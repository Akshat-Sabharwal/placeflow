"use client";

import Link from "next/link";
import { Button } from "@chakra-ui/react";
import { ScanText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api-client/profile";
import { queryKeys } from "@/lib/queries/keys";
import { PageHeader } from "@/components/page-header";
import { ApiErrorAlert, PageSkeleton } from "@/components/async-state";
import { ProfileReadonly } from "@/components/profile-readonly";

export default function StudentProfilePage() {
  const query = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  if (query.isLoading) return <PageSkeleton rows={2} />;
  return <><PageHeader eyebrow="Document-backed profile" title="Your active placement record" description="This profile is derived from your active uploaded document. To change it, upload and review a new source." actions={<Button asChild variant="outline"><Link href="/student/onboarding"><ScanText size={17} />Update from document</Link></Button>} />{query.isError ? <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} /> : query.data?.profile ? <ProfileReadonly profile={query.data.profile} /> : null}</>;
}
