"use client";

import { useQuery } from "@tanstack/react-query";
import { getProfile } from "@/lib/api-client/profile";
import { queryKeys } from "@/lib/queries/keys";
import { PageHeader } from "@/components/page-header";
import { ApiErrorAlert, PageSkeleton } from "@/components/async-state";
import { ProfileForm } from "@/components/profile-form";

export default function StudentProfilePage() {
  const query = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  if (query.isLoading) return <PageSkeleton rows={2} />;
  return <><PageHeader eyebrow="Student profile" title="Your details" description="Keep your academic record current so every eligibility check is accurate." />{query.isError ? <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} /> : <ProfileForm profile={query.data?.profile} />}</>;
}
