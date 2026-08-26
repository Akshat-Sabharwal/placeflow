"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Grid, Heading, Spinner, Text } from "@chakra-ui/react";
import { ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { CandidateResponse } from "@/lib/contracts/domain";
import { getMyApplications, updateCandidateResponse } from "@/lib/api-client/applications";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { colors } from "@/lib/ui/tokens";
import { formatDate, formatDateTime, titleCase } from "@/lib/ui/format";
import { PageHeader } from "@/components/page-header";
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";

type PendingResponse = { applicationId: string; response: Exclude<CandidateResponse, "pending"> } | null;

export default function StudentApplicationsPage() {
  return <Suspense fallback={<PageSkeleton rows={4} />}><StudentApplications /></Suspense>;
}

function StudentApplications() {
  const searchParams = useSearchParams();
  const [activeOnly, setActiveOnly] = useState(searchParams.get("filter") === "active");
  const [pendingResponse, setPendingResponse] = useState<PendingResponse>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.myApplications(),
    queryFn: getMyApplications,
    refetchInterval: whenVisible(polling.applications),
  });
  const responseMutation = useMutation({
    mutationFn: ({ applicationId, response }: NonNullable<PendingResponse>) =>
      updateCandidateResponse(applicationId, response),
    onSuccess: async (_, variables) => {
      toast.success(variables.response === "accepted" ? "You accepted this opportunity." : "You declined this opportunity.");
      setPendingResponse(null);
      await queryClient.invalidateQueries({ queryKey: ["applications", "me"] });
    },
    onError: () => toast.error("Your response could not be saved."),
  });

  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  const applications = activeOnly
    ? (query.data ?? []).filter((item) => ["applied", "shortlisted", "selected"].includes(item.status))
    : query.data ?? [];

  return (
    <>
      <PageHeader
        eyebrow="Your progress"
        title="Applications"
        description="Track every outcome and accept or decline opportunities after you are shortlisted."
        actions={query.isFetching ? <Flex color={colors.muted} fontSize="sm" gap="2"><Spinner size="xs" />Updating</Flex> : undefined}
      />
      {activeOnly && <Flex mb="4" align="center" gap="2"><Text fontSize="sm" color={colors.info} fontWeight="700">Showing active applications</Text><Button size="xs" variant="ghost" onClick={() => setActiveOnly(false)}>Show all</Button></Flex>}
      {query.isRefetchError && <Box mb="5"><RefreshNotice onRetry={() => query.refetch()} /></Box>}
      {applications.length ? (
        <Flex id="status-table" direction="column" gap="3">
          {applications.map((application) => {
            const canRespond = ["shortlisted", "selected"].includes(application.status);
            return (
              <Grid
                key={application.id}
                bg={colors.surface}
                border="1px solid"
                borderColor={colors.line}
                borderRadius="16px"
                p="5"
                templateColumns={{ base: "1fr", md: "1.35fr .65fr .65fr auto" }}
                gap="4"
                alignItems="center"
              >
                <Link href={`/student/drives/${application.driveId}`} aria-label={`View ${application.jobRole ?? "placement drive"} application`}>
                  <Heading as="h2" fontSize="lg">{application.jobRole ?? "Placement drive"}</Heading>
                  <Text color={colors.muted}>{application.companyName ?? "Company"}</Text>
                </Link>
                <Box><Text fontSize="xs" color={colors.muted}>Applied</Text><Text fontWeight="700" mt="1">{formatDate(application.appliedAt)}</Text></Box>
                <Box><Text fontSize="xs" color={colors.muted}>Drive date</Text><Text fontWeight="700" mt="1">{formatDateTime(application.driveDate)}</Text></Box>
                <Flex direction="column" align={{ base: "start", md: "end" }} gap="2">
                  <StatusBadge status={application.status} />
                  <Button asChild size="xs" variant="ghost"><Link href={`/student/drives/${application.driveId}`}>View <ArrowRight size={14} /></Link></Button>
                </Flex>
                {canRespond && (
                  <Flex gridColumn={{ base: "1", md: "1 / -1" }} pt="3" borderTop="1px solid" borderColor={colors.line} justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap="3">
                    <Box>
                      <Text fontWeight="800">Your decision</Text>
                      <Text color={colors.muted} fontSize="sm">
                        {application.candidateResponse === "pending"
                          ? "Tell the coordinator whether you want to continue."
                          : `Response sent: ${titleCase(application.candidateResponse)}`}
                      </Text>
                    </Box>
                    <Flex gap="2">
                      <Button
                        size="sm"
                        bg={colors.successSoft}
                        color={colors.success}
                        border="1px solid"
                        borderColor={colors.success}
                        _hover={{ bg: colors.success, color: colors.onSignal }}
                        _active={{ bg: colors.success, color: colors.onSignal }}
                        onClick={() => setPendingResponse({ applicationId: application.id, response: "accepted" })}
                      >
                        <Check size={15} />Accept
                      </Button>
                      <Button
                        size="sm"
                        bg={colors.dangerSoft}
                        color={colors.danger}
                        border="1px solid"
                        borderColor={colors.danger}
                        _hover={{ bg: colors.danger, color: colors.onSignal }}
                        _active={{ bg: colors.danger, color: colors.onSignal }}
                        onClick={() => setPendingResponse({ applicationId: application.id, response: "declined" })}
                      >
                        <X size={15} />Decline
                      </Button>
                    </Flex>
                  </Flex>
                )}
              </Grid>
            );
          })}
        </Flex>
      ) : (
        <EmptyState
          title={activeOnly ? "No active applications" : "You haven't applied to any drives yet"}
          description={activeOnly ? "Completed outcomes remain available when you show all applications." : "Open a placement drive, review your eligibility status, and submit an application with your resume."}
        />
      )}
      <ConfirmDialog
        open={Boolean(pendingResponse)}
        onOpenChange={(open) => !open && setPendingResponse(null)}
        title={pendingResponse?.response === "accepted" ? "Accept this opportunity?" : "Decline this opportunity?"}
        description="Your response will be saved and sent to the coordinator managing this drive. You can change it later while the application remains shortlisted or selected."
        confirmLabel={pendingResponse?.response === "accepted" ? "Accept" : "Decline"}
        onConfirm={() => pendingResponse && responseMutation.mutate(pendingResponse)}
        pending={responseMutation.isPending}
        destructive={pendingResponse?.response === "declined"}
      />
    </>
  );
}
