"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Input, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { Download, ExternalLink, Files, Search } from "lucide-react";
import { toast } from "sonner";
import type { ApplicantDTO, ApplicationStatus } from "@/lib/contracts/domain";
import { changeApplicationStatus, getDriveApplications } from "@/lib/api-client/applications";
import { getDocumentUrl } from "@/lib/api-client/documents";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { colors } from "@/lib/ui/tokens";
import { formatDate, titleCase } from "@/lib/ui/format";
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";

type OutcomeFilter = "all" | "accepted" | "rejected" | "in_progress";
const nextStatuses: Record<ApplicationStatus, Exclude<ApplicationStatus, "applied">[]> = {
  applied: ["shortlisted", "rejected"],
  shortlisted: ["selected", "rejected"],
  selected: [],
  rejected: [],
};

function matchesOutcome(applicant: ApplicantDTO, outcome: OutcomeFilter) {
  if (outcome === "all") return true;
  if (outcome === "accepted") return applicant.applicationStatus === "selected" || applicant.candidateResponse === "accepted";
  if (outcome === "rejected") return applicant.applicationStatus === "rejected" || applicant.candidateResponse === "declined";
  return applicant.applicationStatus !== "rejected"
    && applicant.applicationStatus !== "selected"
    && applicant.candidateResponse !== "accepted"
    && applicant.candidateResponse !== "declined";
}

export function ApplicantList({ driveId }: { driveId: string }) {
  const [search, setSearch] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [pendingChange, setPendingChange] = useState<{ applicant: ApplicantDTO; status: Exclude<ApplicationStatus, "applied"> } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.driveApplications(driveId),
    queryFn: () => getDriveApplications(driveId),
    refetchInterval: whenVisible(polling.applicants),
  });
  const statusMutation = useMutation({
    mutationFn: ({ applicant, status }: NonNullable<typeof pendingChange>) =>
      changeApplicationStatus(applicant.applicationId, status),
    onSuccess: async () => {
      toast.success("Application status updated.");
      setPendingChange(null);
      await queryClient.invalidateQueries({ queryKey: ["drive-applications", driveId] });
    },
  });
  const filtered = useMemo(() => (query.data ?? []).filter((applicant) => {
    const text = `${applicant.fullName ?? ""} ${applicant.rollNumber ?? ""} ${applicant.branch ?? ""}`.toLowerCase();
    return matchesOutcome(applicant, outcome) && text.includes(search.trim().toLowerCase());
  }), [outcome, query.data, search]);

  async function openDocument(applicationId: string, documentId: string, label: string) {
    setOpeningId(`${applicationId}:${documentId}`);
    try {
      const { signedUrl } = await getDocumentUrl(documentId);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Could not open the ${label}.`);
    } finally {
      setOpeningId(null);
    }
  }

  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;

  return (
    <>
      <Flex justify="space-between" direction={{ base: "column", lg: "row" }} gap="3" mb="5">
        <Box position="relative" w={{ base: "full", lg: "300px" }}>
          <Box position="absolute" zIndex="1" left="3" top="50%" transform="translateY(-50%)" color={colors.muted}><Search size={16} /></Box>
          <Input pl="10" bg={colors.surface} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" aria-label="Search applicants" />
        </Box>
        <Flex gap="3" direction={{ base: "column", sm: "row" }}>
          <NativeSelect.Root w={{ base: "full", sm: "210px" }}>
            <NativeSelect.Field value={outcome} onChange={(event) => setOutcome(event.target.value as OutcomeFilter)} aria-label="Filter applicants by outcome">
              <option value="all">All applicants</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
              <option value="in_progress">In progress</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
          <Button asChild variant="outline">
            <a href={`/api/drives/${driveId}/applications/report?outcome=${outcome}`} download>
              <Download size={16} />Download PDF report
            </a>
          </Button>
        </Flex>
      </Flex>
      {query.isRefetchError && <Box mb="4"><RefreshNotice onRetry={() => query.refetch()} /></Box>}
      {query.isFetching && <Flex justify="end" color={colors.muted} fontSize="sm" mb="3" gap="2"><Spinner size="xs" />Updating applicants</Flex>}
      {filtered.length ? (
        <>
          <Box display={{ base: "none", lg: "block" }} bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="16px" overflowX="auto">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["Student", "Academics", "Documents", "Application", "Candidate", "Action"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "14px 16px", fontSize: 12, color: colors.muted, borderBottom: `1px solid ${colors.line}` }}>{heading}</th>)}</tr></thead>
              <tbody>
                {filtered.map((applicant) => (
                  <tr key={applicant.applicationId}>
                    <td style={cellStyle}><Text fontWeight="700">{applicant.fullName ?? "Profile incomplete"}</Text><Text fontSize="sm" color={colors.muted}>{applicant.rollNumber ?? "No roll number"} · {applicant.branch ?? "No branch"}</Text></td>
                    <td style={cellStyle}><Text fontSize="sm">CGPA {applicant.cgpa ?? "—"}</Text><Text fontSize="sm" color={colors.muted}>{applicant.backlogs ?? "—"} backlogs</Text></td>
                    <td style={cellStyle}>
                      <Flex gap="1" wrap="wrap">
                        <Button size="xs" variant="ghost" loading={openingId === `${applicant.applicationId}:${applicant.resumeDocumentId}`} onClick={() => openDocument(applicant.applicationId, applicant.resumeDocumentId, "resume")}><ExternalLink size={14} />Resume</Button>
                        {applicant.activeProfileDocumentId && <Button size="xs" variant="ghost" loading={openingId === `${applicant.applicationId}:${applicant.activeProfileDocumentId}`} onClick={() => openDocument(applicant.applicationId, applicant.activeProfileDocumentId!, "active profile source")}><Files size={14} />Profile source</Button>}
                      </Flex>
                    </td>
                    <td style={cellStyle}><StatusBadge status={applicant.applicationStatus} /><Text fontSize="xs" color={colors.muted} mt="1">{formatDate(applicant.appliedAt)}</Text></td>
                    <td style={cellStyle}><Text fontWeight="700" color={applicant.candidateResponse === "accepted" ? colors.success : applicant.candidateResponse === "declined" ? colors.danger : colors.muted}>{titleCase(applicant.candidateResponse)}</Text></td>
                    <td style={cellStyle}><StatusActions applicant={applicant} onSelect={(status) => setPendingChange({ applicant, status })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
          <Flex display={{ base: "flex", lg: "none" }} direction="column" gap="3">
            {filtered.map((applicant) => (
              <Box key={applicant.applicationId} bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="14px" p="4">
                <Flex justify="space-between" gap="3"><Box><Text fontWeight="800">{applicant.fullName ?? "Profile incomplete"}</Text><Text color={colors.muted} fontSize="sm">{applicant.rollNumber ?? "No roll number"} · {applicant.branch ?? "No branch"}</Text></Box><StatusBadge status={applicant.applicationStatus} /></Flex>
                <Flex mt="4" gap="5"><Text fontSize="sm">CGPA <b>{applicant.cgpa ?? "—"}</b></Text><Text fontSize="sm">Candidate <b>{titleCase(applicant.candidateResponse)}</b></Text></Flex>
                <Flex mt="4" justify="space-between" gap="2" wrap="wrap">
                  <Flex gap="1"><Button size="sm" variant="outline" onClick={() => openDocument(applicant.applicationId, applicant.resumeDocumentId, "resume")}><ExternalLink size={14} />Resume</Button>{applicant.activeProfileDocumentId && <Button size="sm" variant="outline" onClick={() => openDocument(applicant.applicationId, applicant.activeProfileDocumentId!, "active profile source")}><Files size={14} />Profile</Button>}</Flex>
                  <StatusActions applicant={applicant} onSelect={(status) => setPendingChange({ applicant, status })} />
                </Flex>
              </Box>
            ))}
          </Flex>
        </>
      ) : (
        <EmptyState title={query.data?.length ? "No applicants match these filters" : "No students have applied to this drive yet"} description={query.data?.length ? "Clear a filter or try a different person." : "New applications will appear automatically while this view is open."} />
      )}
      <ConfirmDialog
        open={Boolean(pendingChange)}
        onOpenChange={(open) => !open && setPendingChange(null)}
        title={`Mark as ${pendingChange?.status ?? "updated"}?`}
        description={`${pendingChange?.applicant.fullName ?? "This student"}'s application will move from ${pendingChange?.applicant.applicationStatus ?? "its current state"} to ${pendingChange?.status ?? "the selected state"}.`}
        confirmLabel={`Mark ${pendingChange?.status ?? "application"}`}
        onConfirm={() => pendingChange && statusMutation.mutate(pendingChange)}
        pending={statusMutation.isPending}
        destructive={pendingChange?.status === "rejected"}
      />
    </>
  );
}

const cellStyle = { padding: "14px 16px", borderBottom: `1px solid ${colors.line}`, verticalAlign: "middle" } as const;

function StatusActions({ applicant, onSelect }: { applicant: ApplicantDTO; onSelect: (status: Exclude<ApplicationStatus, "applied">) => void }) {
  const options = nextStatuses[applicant.applicationStatus];
  if (!options.length) return <Text fontSize="sm" color={colors.muted}>Final</Text>;
  return <NativeSelect.Root size="sm" minW="132px"><NativeSelect.Field aria-label={`Change status for ${applicant.fullName ?? "student"}`} value="" onChange={(event) => event.target.value && onSelect(event.target.value as Exclude<ApplicationStatus, "applied">)}><option value="">Change…</option>{options.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>;
}
