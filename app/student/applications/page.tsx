"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Flex, Grid, Heading, Spinner, Text } from "@chakra-ui/react";
import { ArrowRight } from "lucide-react";
import { getMyApplications } from "@/lib/api-client/applications";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { colors } from "@/lib/ui/tokens";
import { formatDate, formatDateTime } from "@/lib/ui/format";
import { PageHeader } from "@/components/page-header";
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { StatusBadge } from "@/components/status-badge";

export default function StudentApplicationsPage() {
  return <Suspense fallback={<PageSkeleton rows={4} />}><StudentApplications /></Suspense>;
}

function StudentApplications() {
  const searchParams = useSearchParams();
  const [activeOnly, setActiveOnly] = useState(searchParams.get("filter") === "active");
  const query = useQuery({ queryKey: queryKeys.myApplications(), queryFn: getMyApplications, refetchInterval: whenVisible(polling.applications) });
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  const applications = activeOnly ? (query.data ?? []).filter((item) => ["applied", "shortlisted"].includes(item.status)) : query.data ?? [];

  return <>
    <PageHeader eyebrow="Your progress" title="Applications" description="Track each outcome. Status updates stay available here even when browser notifications are off." actions={query.isFetching ? <Flex color={colors.muted} fontSize="sm" gap="2"><Spinner size="xs" />Updating</Flex> : undefined} />
    {activeOnly && <Flex mb="4" align="center" gap="2"><Text fontSize="sm" color={colors.info} fontWeight="700">Showing active applications</Text><Button size="xs" variant="ghost" onClick={() => setActiveOnly(false)}>Show all</Button></Flex>}
    {query.isRefetchError && <Box mb="5"><RefreshNotice onRetry={() => query.refetch()} /></Box>}
    {applications.length ? <Flex id="status-table" direction="column" gap="3">{applications.map((application) => (
      <Link key={application.id} href={`/student/drives/${application.driveId}`} aria-label={`View ${application.jobRole ?? "placement drive"} application`}>
        <Grid bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="16px" p="5" templateColumns={{ base: "1fr", md: "1.5fr .7fr .7fr auto auto" }} gap="4" alignItems="center" transition=".16s ease" _hover={{ borderColor: colors.signal, transform: "translateY(-2px)", boxShadow: "var(--shadow-sm)" }}>
          <Box><Heading as="h2" fontSize="lg">{application.jobRole ?? "Placement drive"}</Heading><Text color={colors.muted}>{application.companyName ?? "Company"}</Text></Box>
          <Box><Text fontSize="xs" color={colors.muted}>Applied</Text><Text fontWeight="700" mt="1">{formatDate(application.appliedAt)}</Text></Box>
          <Box><Text fontSize="xs" color={colors.muted}>Drive date</Text><Text fontWeight="700" mt="1">{formatDateTime(application.driveDate)}</Text></Box>
          <StatusBadge status={application.status} /><ArrowRight size={17} />
        </Grid>
      </Link>
    ))}</Flex> : <EmptyState title={activeOnly ? "No active applications" : "You haven't applied to any drives yet"} description={activeOnly ? "Selected and rejected outcomes remain available when you show all applications." : "Open a placement drive, review the eligibility rules, and submit an application with your resume."} />}
  </>;
}
