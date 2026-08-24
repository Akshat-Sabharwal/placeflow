"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import { ArrowRight, BriefcaseBusiness, FileText, LayoutList } from "lucide-react";
import { getStudentDashboard } from "@/lib/api-client/dashboard";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { colors } from "@/lib/ui/tokens";
import { DriveCard } from "@/components/drive-card";
import { EmptyState, PageSkeleton } from "@/components/async-state";
import { StatusBadge } from "@/components/status-badge";

export default function StudentHomePage() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: queryKeys.studentDashboard,
    queryFn: getStudentDashboard,
    refetchInterval: whenVisible(polling.applications),
  });

  useEffect(() => {
    if (!dashboard.data) return;
    queryClient.setQueryData(queryKeys.profile, {
      viewer: dashboard.data.viewer,
      profile: dashboard.data.profile,
    });
    queryClient.setQueryData(queryKeys.drives(), dashboard.data.drives);
    queryClient.setQueryData(
      queryKeys.myApplications(),
      dashboard.data.applications,
    );
  }, [dashboard.data, queryClient]);

  if (dashboard.isLoading) return <PageSkeleton rows={4} />;
  const data = dashboard.data;
  const name = data?.profile.fullName?.split(" ")[0] ?? "there";
  const open = data?.drives.filter((drive) => drive.status === "published" && drive.eligibility?.eligible).length ?? 0;
  const latest = data?.applications[0];
  return <><Text color={colors.signalDark} fontWeight="800" textTransform="uppercase" letterSpacing=".08em" fontSize="xs">Student workspace</Text><Heading as="h1" mt="2" fontSize={{ base: "3xl", md: "5xl" }} letterSpacing="-.05em">Hi, {name}.</Heading><Text color={colors.muted} mt="3">Here is what needs your attention today.</Text><Grid mt="8" templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }} gap="4"><Summary icon={BriefcaseBusiness} label="Eligible open drives" value={String(open)} /><Summary icon={LayoutList} label="Active applications" value={String(data?.applications.filter((item) => ["applied", "shortlisted"].includes(item.status)).length ?? 0)} /><Summary icon={FileText} label="Latest status" value={latest ? <StatusBadge status={latest.status} /> : "None yet"} /></Grid><Flex mt="10" justify="space-between" align="center"><Heading as="h2" fontSize="2xl">Open opportunities</Heading><Button asChild variant="ghost" size="sm"><Link href="/student/drives">View all <ArrowRight size={15} /></Link></Button></Flex><Box mt="4">{data?.drives.length ? <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap="4">{data.drives.filter((drive) => drive.status === "published").slice(0, 4).map((drive) => <DriveCard key={drive.id} drive={drive} />)}</Grid> : <EmptyState title="No open drives yet" description="Published drives will appear here automatically." />}</Box></>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: React.ReactNode }) {
  return <Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="16px" p="5"><Box color={colors.signal}><Icon size={20} /></Box><Text color={colors.muted} fontSize="sm" mt="6">{label}</Text><Box fontSize="2xl" fontWeight="800" mt="1">{value}</Box></Box>;
}
