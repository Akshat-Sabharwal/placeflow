"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Input, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import type { ApplicantDTO, ApplicationStatus } from "@/lib/contracts/domain";
import { changeApplicationStatus, getDriveApplications } from "@/lib/api-client/applications";
import { getDocumentUrl } from "@/lib/api-client/documents";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { colors } from "@/lib/ui/tokens";
import { formatDate } from "@/lib/ui/format";
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { StatusBadge } from "@/components/status-badge";

const nextStatuses: Record<ApplicationStatus, Exclude<ApplicationStatus, "applied">[]> = {
  applied: ["shortlisted", "rejected"], shortlisted: ["selected", "rejected"], selected: [], rejected: [],
};

export function ApplicantList({ driveId }: { driveId: string }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "all">("all");
  const [pendingChange, setPendingChange] = useState<{ applicant: ApplicantDTO; status: Exclude<ApplicationStatus, "applied"> } | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.driveApplications(driveId), queryFn: () => getDriveApplications(driveId), refetchInterval: whenVisible(polling.applicants) });
  const statusMutation = useMutation({
    mutationFn: ({ applicant, status: target }: NonNullable<typeof pendingChange>) => changeApplicationStatus(applicant.applicationId, target),
    onSuccess: async () => { toast.success("Application status updated."); setPendingChange(null); await queryClient.invalidateQueries({ queryKey: ["drive-applications", driveId] }); },
  });
  const filtered = useMemo(() => (query.data ?? []).filter((applicant) => {
    const matchesStatus = status === "all" || applicant.applicationStatus === status;
    const text = `${applicant.fullName ?? ""} ${applicant.rollNumber ?? ""}`.toLowerCase();
    return matchesStatus && text.includes(search.trim().toLowerCase());
  }), [query.data, search, status]);
  async function openResume(applicant: ApplicantDTO) {
    setOpeningId(applicant.applicationId);
    try {
      const { signedUrl } = await getDocumentUrl(applicant.resumeDocumentId);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not open this resume."); }
    finally { setOpeningId(null); }
  }
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;

  return <><Flex justify="space-between" direction={{ base: "column", md: "row" }} gap="3" mb="5"><Box position="relative" w={{ base: "full", md: "300px" }}><Box position="absolute" zIndex="1" left="3" top="50%" transform="translateY(-50%)" color={colors.muted}><Search size={16} /></Box><Input pl="10" bg={colors.surface} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or roll number" aria-label="Search applicants" /></Box><NativeSelect.Root w={{ base: "full", md: "200px" }}><NativeSelect.Field value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="Filter applicants by status"><option value="all">All statuses</option><option value="applied">Applied</option><option value="shortlisted">Shortlisted</option><option value="selected">Selected</option><option value="rejected">Rejected</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Flex>{query.isRefetchError && <Box mb="4"><RefreshNotice onRetry={() => query.refetch()} /></Box>}{query.isFetching && <Flex justify="end" color={colors.muted} fontSize="sm" mb="3" gap="2"><Spinner size="xs" />Updating applicants</Flex>}{filtered.length ? <><Box display={{ base: "none", lg: "block" }} bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="16px" overflowX="auto"><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Student", "Academics", "Applied", "Resume", "Status", "Action"].map((heading) => <th key={heading} style={{ textAlign: "left", padding: "14px 16px", fontSize: 12, color: colors.muted, borderBottom: `1px solid ${colors.line}` }}>{heading}</th>)}</tr></thead><tbody>{filtered.map((applicant) => <tr key={applicant.applicationId}><td style={cellStyle}><Text fontWeight="700">{applicant.fullName ?? "Profile incomplete"}</Text><Text fontSize="sm" color={colors.muted}>{applicant.rollNumber ?? "No roll number"} · {applicant.branch ?? "No branch"}</Text></td><td style={cellStyle}><Text fontSize="sm">CGPA {applicant.cgpa ?? "—"}</Text><Text fontSize="sm" color={colors.muted}>{applicant.backlogs ?? "—"} backlogs</Text></td><td style={cellStyle}>{formatDate(applicant.appliedAt)}</td><td style={cellStyle}><Button size="xs" variant="ghost" loading={openingId === applicant.applicationId} onClick={() => openResume(applicant)}><ExternalLink size={14} />View</Button></td><td style={cellStyle}><StatusBadge status={applicant.applicationStatus} /></td><td style={cellStyle}><StatusActions applicant={applicant} onSelect={(target) => setPendingChange({ applicant, status: target })} /></td></tr>)}</tbody></table></Box><Flex display={{ base: "flex", lg: "none" }} direction="column" gap="3">{filtered.map((applicant) => <Box key={applicant.applicationId} bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="14px" p="4"><Flex justify="space-between" gap="3"><Box><Text fontWeight="800">{applicant.fullName ?? "Profile incomplete"}</Text><Text color={colors.muted} fontSize="sm">{applicant.rollNumber ?? "No roll number"} · {applicant.branch ?? "No branch"}</Text></Box><StatusBadge status={applicant.applicationStatus} /></Flex><Flex mt="4" gap="5"><Text fontSize="sm">CGPA <b>{applicant.cgpa ?? "—"}</b></Text><Text fontSize="sm">Backlogs <b>{applicant.backlogs ?? "—"}</b></Text></Flex><Flex mt="4" justify="space-between"><Button size="sm" variant="outline" loading={openingId === applicant.applicationId} onClick={() => openResume(applicant)}><ExternalLink size={14} />Resume</Button><StatusActions applicant={applicant} onSelect={(target) => setPendingChange({ applicant, status: target })} /></Flex></Box>)}</Flex></> : <EmptyState title={query.data?.length ? "No applicants match these filters" : "No students have applied to this drive yet"} description={query.data?.length ? "Clear a filter or try a different search." : "New applications will appear automatically while this view is open."} />}<ConfirmDialog open={Boolean(pendingChange)} onOpenChange={(open) => !open && setPendingChange(null)} title={`Mark as ${pendingChange?.status ?? "updated"}?`} description={`${pendingChange?.applicant.fullName ?? "This student"}'s application will move from ${pendingChange?.applicant.applicationStatus ?? "its current state"} to ${pendingChange?.status ?? "the selected state"}.`} confirmLabel={`Mark ${pendingChange?.status ?? "application"}`} onConfirm={() => pendingChange && statusMutation.mutate(pendingChange)} pending={statusMutation.isPending} destructive={pendingChange?.status === "rejected"} /></>;
}

const cellStyle = { padding: "14px 16px", borderBottom: `1px solid ${colors.line}`, verticalAlign: "middle" } as const;

function StatusActions({ applicant, onSelect }: { applicant: ApplicantDTO; onSelect: (status: Exclude<ApplicationStatus, "applied">) => void }) {
  const options = nextStatuses[applicant.applicationStatus];
  if (!options.length) return <Text fontSize="sm" color={colors.muted}>Final</Text>;
  return <NativeSelect.Root size="sm" minW="132px"><NativeSelect.Field aria-label={`Change status for ${applicant.fullName ?? "student"}`} value="" onChange={(event) => event.target.value && onSelect(event.target.value as Exclude<ApplicationStatus, "applied">)}><option value="">Change…</option>{options.map((option) => <option key={option} value={option}>{option[0].toUpperCase() + option.slice(1)}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>;
}
