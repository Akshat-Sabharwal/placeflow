"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Flex, Grid, Input, Spinner, Text } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { getDrives } from "@/lib/api-client/drives";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { DriveCard } from "@/components/drive-card";
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { colors } from "@/lib/ui/tokens";

type Filter = "open" | "pinned" | "applied" | "all";

export function StudentDrives() {
  const searchParams = useSearchParams();
  const requestedFilter = searchParams.get("filter");
  const [filter, setFilter] = useState<Filter>(
    requestedFilter === "pinned" || requestedFilter === "applied" || requestedFilter === "all"
      ? requestedFilter
      : "open",
  );
  const [eligibleOnly, setEligibleOnly] = useState(searchParams.get("eligibility") === "eligible");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: queryKeys.drives({}), queryFn: () => getDrives(), refetchInterval: whenVisible(polling.drives) });
  const drives = useMemo(() => (query.data ?? []).filter((drive) => {
    if (filter === "open" && drive.status !== "published") return false;
    if (filter === "pinned" && !drive.pinned) return false;
    if (filter === "applied" && !drive.alreadyApplied) return false;
    if (eligibleOnly && !drive.eligibility?.eligible) return false;
    const text = `${drive.companyName} ${drive.jobRole}`.toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }), [eligibleOnly, filter, query.data, search]);
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;

  return <><Flex gap="3" justify="space-between" direction={{ base: "column", md: "row" }} mb="6"><Flex bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="full" p="1" gap="1" aria-label="Drive filters">{(["open", "pinned", "applied", "all"] as const).map((item) => <Button key={item} size="sm" borderRadius="full" variant={filter === item ? "solid" : "ghost"} bg={filter === item ? colors.neutralSolid : undefined} color={filter === item ? colors.onNeutral : colors.muted} _hover={{ bg: filter === item ? colors.neutralSolidHover : colors.paperDeep, color: filter === item ? colors.onNeutral : colors.ink }} _active={{ bg: filter === item ? colors.neutralSolidHover : colors.paperDeep }} onClick={() => setFilter(item)} textTransform="capitalize">{item}</Button>)}</Flex><Box position="relative" w={{ base: "full", md: "290px" }}><Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color={colors.muted}><Search size={17} /></Box><Input value={search} onChange={(event) => setSearch(event.target.value)} pl="10" bg={colors.surface} placeholder="Search company or role" aria-label="Search drives" /></Box></Flex>{eligibleOnly && <Flex mb="4" align="center" gap="2"><Text fontSize="sm" color={colors.success} fontWeight="700">Showing only drives you are eligible for</Text><Button size="xs" variant="ghost" onClick={() => setEligibleOnly(false)}>Show all</Button></Flex>}{query.isRefetchError && <Box mb="5"><RefreshNotice onRetry={() => query.refetch()} /></Box>}{query.isFetching && !query.isLoading && <Flex justify="end" mb="3" color={colors.muted} fontSize="sm" gap="2"><Spinner size="xs" />Updating drives</Flex>}{drives.length ? <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap="4">{drives.map((drive) => <DriveCard key={drive.id} drive={drive} />)}</Grid> : <EmptyState title={search ? "No matching drives" : filter === "pinned" ? "No pinned jobs yet" : filter === "applied" ? "You haven't applied to a drive yet" : "No placement drives are open right now"} description={search ? "Try a different company or role." : filter === "pinned" ? "Pin a useful job to keep it close." : "New drives will appear here as soon as coordinators publish them."} />}</>;
}
