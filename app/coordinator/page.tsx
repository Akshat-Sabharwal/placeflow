"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Grid, Heading, Text } from "@chakra-ui/react";
import { BriefcaseBusiness, LayoutList, Plus } from "lucide-react";
import { getDrives } from "@/lib/api-client/drives";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { DriveCard } from "@/components/drive-card";
import { EmptyState, PageSkeleton } from "@/components/async-state";

export default function CoordinatorHomePage() {
  const query = useQuery({ queryKey: queryKeys.drives({ coordinatorHome: true }), queryFn: () => getDrives() });
  if (query.isLoading) return <PageSkeleton rows={4} />;
  const drives = query.data ?? [];
  return <><Text color={colors.signalDark} fontWeight="800" textTransform="uppercase" letterSpacing=".08em" fontSize="xs">Coordinator workspace</Text><Heading as="h1" mt="2" fontSize={{ base: "3xl", md: "5xl" }} letterSpacing="-.05em">Keep every drive moving.</Heading><Text color={colors.muted} mt="3">Publish opportunities, review applicants, and record outcomes from one workspace.</Text><Grid mt="8" templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }} gap="4"><Summary icon={BriefcaseBusiness} label="Active drives" value={drives.filter((drive) => !["completed", "cancelled"].includes(drive.status)).length} /><Summary icon={LayoutList} label="Current applications" value={drives.reduce((total, drive) => total + (drive.applicationCount ?? 0), 0)} /></Grid><Button asChild mt="6" bg={colors.signal} color={colors.ink}><Link href="/coordinator/drives/new"><Plus size={17} />Create drive</Link></Button><Heading as="h2" fontSize="2xl" mt="10" mb="4">Latest drives</Heading>{drives.length ? <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap="4">{drives.slice(0, 4).map((drive) => <DriveCard key={drive.id} drive={drive} coordinator />)}</Grid> : <EmptyState title="No drives created yet" description="Create the first drive, save it as a draft, and publish when the details are ready." />}</>;
}

function Summary({ icon: Icon, label, value }: { icon: typeof BriefcaseBusiness; label: string; value: number }) {
  return <Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="16px" p="5"><Box color={colors.signal}><Icon size={20} /></Box><Text color={colors.muted} fontSize="sm" mt="6">{label}</Text><Text fontSize="3xl" fontWeight="800" mt="1">{value}</Text></Box>;
}
