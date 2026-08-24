"use client";

import { useQuery } from "@tanstack/react-query";
import { Box, Flex, Grid, Heading, Spinner, Text } from "@chakra-ui/react";
import { getMyApplications } from "@/lib/api-client/applications";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { colors } from "@/lib/ui/tokens";
import { formatDate, formatDateTime } from "@/lib/ui/format";
import { PageHeader } from "@/components/page-header";
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { StatusBadge } from "@/components/status-badge";

export default function StudentApplicationsPage() {
  const query = useQuery({ queryKey: queryKeys.myApplications(), queryFn: getMyApplications, refetchInterval: whenVisible(polling.applications) });
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  return <><PageHeader eyebrow="Your progress" title="Applications" description="Track each outcome. Status updates stay available here even when browser notifications are off." actions={query.isFetching ? <Flex color={colors.muted} fontSize="sm" gap="2"><Spinner size="xs" />Updating</Flex> : undefined} />{query.isRefetchError && <Box mb="5"><RefreshNotice onRetry={() => query.refetch()} /></Box>}{query.data?.length ? <Flex direction="column" gap="3">{query.data.map((application) => <Grid key={application.id} bg="white" border="1px solid" borderColor={colors.line} borderRadius="16px" p="5" templateColumns={{ base: "1fr", md: "1.5fr .7fr .7fr auto" }} gap="4" alignItems="center"><Box><Heading as="h2" fontSize="lg">{application.jobRole ?? "Placement drive"}</Heading><Text color={colors.muted}>{application.companyName ?? "Company"}</Text></Box><Box><Text fontSize="xs" color={colors.muted}>Applied</Text><Text fontWeight="700" mt="1">{formatDate(application.appliedAt)}</Text></Box><Box><Text fontSize="xs" color={colors.muted}>Drive date</Text><Text fontWeight="700" mt="1">{formatDateTime(application.driveDate)}</Text></Box><StatusBadge status={application.status} /></Grid>)}</Flex> : <EmptyState title="You haven't applied to any drives yet" description="Open a placement drive, review the eligibility rules, and submit an application with your resume." />}</>;
}
