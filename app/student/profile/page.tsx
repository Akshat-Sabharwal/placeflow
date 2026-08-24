"use client";

import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api-client/profile";
import { queryKeys } from "@/lib/queries/keys";
import { PageHeader } from "@/components/page-header";
import { ApiErrorAlert, PageSkeleton } from "@/components/async-state";
import { ProfileReadonly } from "@/components/profile-readonly";

export default function StudentProfilePage() {
  const query = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  if (query.isLoading) return <PageSkeleton rows={2} />;
  return <><PageHeader eyebrow="Verified profile" title="Your placement record" description="Copy useful details and review the academic values used in eligibility checks." />{query.isError ? <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} /> : query.data?.profile ? <ProfileReadonly profile={query.data.profile} /> : null}</>;
}
