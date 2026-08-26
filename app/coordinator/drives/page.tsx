"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button, Flex, Grid } from "@chakra-ui/react";
import { Plus } from "lucide-react";
import { getDrives } from "@/lib/api-client/drives";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { PageHeader } from "@/components/page-header";
import { DriveCard } from "@/components/drive-card";
import { ApiErrorAlert, EmptyState, PageSkeleton } from "@/components/async-state";

type Filter = "active" | "completed" | "cancelled" | "all";

export default function CoordinatorDrivesPage() {
  const [filter, setFilter] = useState<Filter>("active");
  const query = useQuery({ queryKey: queryKeys.drives(), queryFn: () => getDrives() });
  const drives = useMemo(() => (query.data ?? []).filter((drive) => filter === "all" || filter === "active" ? filter === "all" || !["completed", "cancelled"].includes(drive.status) : drive.status === filter), [filter, query.data]);
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  return <><PageHeader eyebrow="Coordinator" title="Placement drives" description="Create, publish, and move each drive through its placement lifecycle." actions={<Button asChild bg={colors.signal} color={colors.onSignal} _hover={{ bg: colors.signalDark }} _active={{ bg: colors.signalDark }}><Link href="/coordinator/drives/new"><Plus size={17} />Create drive</Link></Button>} /><Flex mb="6" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="full" p="1" w="fit-content" maxW="full" overflowX="auto">{(["active", "completed", "cancelled", "all"] as const).map((item) => <Button key={item} size="sm" borderRadius="full" variant="ghost" bg={filter === item ? colors.neutralSolid : undefined} color={filter === item ? colors.onNeutral : colors.muted} _hover={{ bg: filter === item ? colors.neutralSolidHover : colors.paperDeep, color: filter === item ? colors.onNeutral : colors.ink }} _active={{ bg: filter === item ? colors.neutralSolidHover : colors.paperDeep }} onClick={() => setFilter(item)} textTransform="capitalize">{item}</Button>)}</Flex>{drives.length ? <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap="4">{drives.map((drive) => <DriveCard key={drive.id} drive={drive} coordinator />)}</Grid> : <EmptyState title={`No ${filter} drives`} description={filter === "active" ? "Create a draft to begin planning the next placement drive." : "Drives in this state will appear here."} action={filter === "active" ? <Button asChild bg={colors.signal} color={colors.onSignal} _hover={{ bg: colors.signalDark }} _active={{ bg: colors.signalDark }}><Link href="/coordinator/drives/new">Create drive</Link></Button> : undefined} />}</>;
}
