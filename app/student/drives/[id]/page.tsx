"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Flex, Grid, Heading, NativeSelect, Spinner, Text } from "@chakra-ui/react";
import { ArrowLeft, CalendarDays, FileText, MapPin, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { applyToDrive } from "@/lib/api-client/applications";
import { getDrive } from "@/lib/api-client/drives";
import { ApiError } from "@/lib/api-client/errors";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { colors } from "@/lib/ui/tokens";
import { formatDateTime } from "@/lib/ui/format";
import { ApiErrorAlert, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { EligibilityPanel } from "@/components/eligibility-panel";
import { StatusBadge } from "@/components/status-badge";

export default function StudentDriveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [resumeId, setResumeId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.drive(id), queryFn: () => getDrive(id), refetchInterval: whenVisible(polling.drive) });
  const mutation = useMutation({
    mutationFn: () => applyToDrive(id, resumeId),
    onSuccess: async () => {
      setConfirming(false);
      toast.success("Application submitted.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.drive(id) }),
        queryClient.invalidateQueries({ queryKey: ["applications", "me"] }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && ["DUPLICATE_APPLICATION", "INELIGIBLE", "DEADLINE_PASSED", "DRIVE_CLOSED"].includes(error.code)) query.refetch();
    },
  });
  if (query.isLoading) return <PageSkeleton rows={3} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;

  const drive = query.data!;
  const resumes = drive.resumes?.filter((document) => document.type === "resume") ?? [];
  const eligible = drive.eligibility?.eligible ?? false;
  const canApply = drive.status === "published" && eligible && !drive.alreadyApplied && Boolean(resumeId);

  return (
    <>
      <Button asChild variant="ghost" size="sm" mb="5"><Link href="/student/drives"><ArrowLeft size={16} />Back to drives</Link></Button>
      {query.isRefetchError && <Box mb="5"><RefreshNotice onRetry={() => query.refetch()} /></Box>}
      <Flex justify="space-between" align="start" gap="5" direction={{ base: "column", md: "row" }}>
        <Box><Text color={colors.signalDark} fontWeight="800" textTransform="uppercase" letterSpacing=".08em" fontSize="xs">{drive.companyName}</Text><Heading as="h1" mt="2" fontSize={{ base: "3xl", md: "5xl" }} letterSpacing="-.05em">{drive.jobRole}</Heading></Box>
        <Flex gap="3" align="center"><StatusBadge status={drive.status} />{query.isFetching && <Spinner size="sm" aria-label="Updating drive" />}</Flex>
      </Flex>
      <Grid mt="8" templateColumns={{ base: "1fr", lg: "1.25fr .75fr" }} gap="5">
        <Box>
          <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
            <Heading as="h2" fontSize="xl">About the role</Heading>
            <Text whiteSpace="pre-wrap" mt="4" color={colors.muted} lineHeight="1.7">{drive.description || "No additional description was provided."}</Text>
            <Grid mt="7" templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap="4"><Fact icon={CalendarDays} label="Apply by" value={formatDateTime(drive.registrationDeadline)} /><Fact icon={CalendarDays} label="Drive date" value={formatDateTime(drive.driveDate)} /><Fact icon={MapPin} label="Location" value={drive.location ?? "To be announced"} /><Fact icon={WalletCards} label="Package" value={drive.packageText ?? "Not specified"} /></Grid>
          </Box>
          <Box mt="5" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
            <Heading as="h2" fontSize="xl">Eligibility requirements</Heading>
            <Grid mt="5" templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap="4"><Requirement label="Branches" value={drive.eligibleBranches.join(", ")} /><Requirement label="Graduation years" value={drive.eligibleYears.join(", ")} /><Requirement label="Minimum CGPA" value={drive.minimumCgpa.toString()} /><Requirement label="Maximum backlogs" value={drive.maximumBacklogs.toString()} /></Grid>
          </Box>
        </Box>
        <Box>
          <EligibilityPanel eligible={eligible} reasons={drive.eligibility?.reasons ?? []} />
          <Box mt="5" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="5">
            <Heading as="h2" fontSize="lg">Your application</Heading>
            {drive.alreadyApplied ? (
              <Alert.Root status="success" mt="4" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>Application submitted</Alert.Title><Alert.Description>Track the latest outcome from Applications.</Alert.Description></Alert.Content></Alert.Root>
            ) : resumes.length ? (
              <Box mt="4">
                <label htmlFor="resume" style={{ fontWeight: 700, fontSize: "14px" }}>Resume</label>
                <NativeSelect.Root mt="2"><NativeSelect.Field id="resume" value={resumeId} onChange={(event) => setResumeId(event.target.value)}><option value="">Choose a resume</option>{resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.originalName}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
                <Button mt="4" w="full" bg={colors.signal} color={colors.ink} disabled={!canApply} onClick={() => setConfirming(true)}>Apply now</Button>
                {!eligible && <Text color={colors.muted} fontSize="sm" mt="3">Resolve the eligibility items above before applying.</Text>}
              </Box>
            ) : (
              <Box mt="4"><Flex color={colors.warning} gap="2" align="center"><FileText size={18} /><Text fontWeight="700">A resume is required.</Text></Flex><Button asChild variant="outline" mt="4"><Link href="/student/documents">Upload a resume</Link></Button></Box>
            )}
            {mutation.isError && <Alert.Root status="error" mt="4" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>Application not submitted</Alert.Title><Alert.Description>{mutation.error.message}</Alert.Description></Alert.Content></Alert.Root>}
          </Box>
        </Box>
      </Grid>
      <ConfirmDialog open={confirming} onOpenChange={setConfirming} title="Submit this application?" description={`Your selected resume will be attached to the ${drive.jobRole} application at ${drive.companyName}.`} confirmLabel="Submit application" onConfirm={() => mutation.mutate()} pending={mutation.isPending} />
    </>
  );
}

function Fact({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <Flex gap="3"><Box color={colors.signal}><Icon size={19} /></Box><Box><Text fontSize="xs" color={colors.muted} textTransform="uppercase" letterSpacing=".06em">{label}</Text><Text fontWeight="700" mt="1">{value}</Text></Box></Flex>;
}

function Requirement({ label, value }: { label: string; value: string }) {
  return <Box bg={colors.paper} borderRadius="12px" p="4"><Text fontSize="xs" color={colors.muted} textTransform="uppercase" letterSpacing=".06em">{label}</Text><Text fontWeight="700" mt="1">{value}</Text></Box>;
}
