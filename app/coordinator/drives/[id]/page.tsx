"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import { ArrowLeft, CalendarDays, MapPin, WalletCards } from "lucide-react";
import { toast } from "sonner";
import type { DriveStatus } from "@/lib/contracts/domain";
import { getDrive, updateDrive } from "@/lib/api-client/drives";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { formatDateTime, titleCase } from "@/lib/ui/format";
import { ApiErrorAlert, PageSkeleton } from "@/components/async-state";
import { ApplicantList } from "@/components/applicant-list";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DriveForm } from "@/components/drive-form";
import { StatusBadge } from "@/components/status-badge";

const transitions: Record<DriveStatus, DriveStatus[]> = { draft: ["published", "cancelled"], published: ["registration_closed", "cancelled"], registration_closed: ["ongoing", "cancelled"], ongoing: ["completed", "cancelled"], completed: [], cancelled: [] };

export default function CoordinatorDriveDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<"overview" | "applicants" | "edit">("overview");
  const [nextStatus, setNextStatus] = useState<DriveStatus | null>(null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.drive(id), queryFn: () => getDrive(id) });
  const statusMutation = useMutation({ mutationFn: (status: DriveStatus) => updateDrive(id, { status }), onSuccess: async () => { toast.success("Drive status updated."); setNextStatus(null); await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.drive(id) }), queryClient.invalidateQueries({ queryKey: ["drives"] })]); } });
  if (query.isLoading) return <PageSkeleton rows={3} />;
  if (query.isError || !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  const drive = query.data;

  return <><Button asChild size="sm" variant="ghost" mb="5"><Link href="/coordinator/drives"><ArrowLeft size={16} />Back to drives</Link></Button><Flex justify="space-between" gap="5" align={{ base: "start", md: "end" }} direction={{ base: "column", md: "row" }}><Box><Text color={colors.signalDark} fontWeight="800" textTransform="uppercase" letterSpacing=".08em" fontSize="xs">{drive.companyName}</Text><Heading as="h1" mt="2" fontSize={{ base: "3xl", md: "5xl" }} letterSpacing="-.05em">{drive.jobRole}</Heading></Box><StatusBadge status={drive.status} /></Flex><Flex mt="8" mb="6" borderBottom="1px solid" borderColor={colors.line} gap="1" overflowX="auto">{(["overview", "applicants", "edit"] as const).map((item) => <Button key={item} variant="ghost" borderRadius="0" borderBottom={tab === item ? "3px solid" : "3px solid transparent"} borderColor={tab === item ? colors.signal : "transparent"} onClick={() => setTab(item)} textTransform="capitalize">{item}</Button>)}</Flex>{tab === "overview" && <Box><Grid templateColumns={{ base: "1fr", lg: "1.2fr .8fr" }} gap="5"><Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}><Heading as="h2" fontSize="xl">Drive overview</Heading><Text mt="4" color={colors.muted} whiteSpace="pre-wrap" lineHeight="1.7">{drive.description || "No description provided."}</Text><Grid mt="7" templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap="4"><Fact icon={CalendarDays} label="Deadline" value={formatDateTime(drive.registrationDeadline)} /><Fact icon={CalendarDays} label="Drive date" value={formatDateTime(drive.driveDate)} /><Fact icon={MapPin} label="Location" value={drive.location ?? "Not set"} /><Fact icon={WalletCards} label="Package" value={drive.packageText ?? "Not set"} /></Grid></Box><Box><Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="18px" p="5"><Text color={colors.muted}>Applications</Text><Text fontSize="4xl" fontWeight="800" mt="1">{drive.applicationCount ?? 0}</Text></Box><Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="18px" p="5" mt="4"><Heading as="h2" fontSize="lg">Next step</Heading>{transitions[drive.status].length ? <Flex mt="4" gap="2" wrap="wrap">{transitions[drive.status].map((status) => <Button key={status} size="sm" variant={status === "cancelled" ? "outline" : "solid"} color={status === "cancelled" ? colors.danger : colors.ink} bg={status === "cancelled" ? "transparent" : colors.signal} onClick={() => setNextStatus(status)}>{titleCase(status)}</Button>)}</Flex> : <Text color={colors.muted} mt="3">This drive is in a final state.</Text>}</Box></Box></Grid></Box>}{tab === "applicants" && <ApplicantList driveId={id} />}{tab === "edit" && <DriveForm drive={drive} />}<ConfirmDialog open={Boolean(nextStatus)} onOpenChange={(open) => !open && setNextStatus(null)} title={`${titleCase(nextStatus ?? "update")} this drive?`} description={`The drive will move from ${titleCase(drive.status)} to ${titleCase(nextStatus ?? drive.status)}. Students will see the persisted change.`} confirmLabel={titleCase(nextStatus ?? "Update")} onConfirm={() => nextStatus && statusMutation.mutate(nextStatus)} pending={statusMutation.isPending} destructive={nextStatus === "cancelled"} /></>;
}

function Fact({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <Flex gap="3"><Box color={colors.signal}><Icon size={19} /></Box><Box><Text fontSize="xs" color={colors.muted} textTransform="uppercase">{label}</Text><Text fontWeight="700" mt="1">{value}</Text></Box></Flex>;
}
