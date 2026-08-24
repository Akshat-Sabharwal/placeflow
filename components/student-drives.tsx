"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Flex, Grid, Input, Spinner } from "@chakra-ui/react";
import { Search } from "lucide-react";
import { getDrives } from "@/lib/api-client/drives";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { DriveCard } from "@/components/drive-card";
import { ApiErrorAlert, EmptyState, PageSkeleton, RefreshNotice } from "@/components/async-state";
import { colors } from "@/lib/ui/tokens";

type Filter = "open" | "applied" | "all";

export function StudentDrives() {
  const [filter, setFilter] = useState<Filter>("open");
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: queryKeys.drives({}), queryFn: () => getDrives(), refetchInterval: whenVisible(polling.drives) });
  const drives = useMemo(() => (query.data ?? []).filter((drive) => {
    if (filter === "open" && drive.status !== "published") return false;
    if (filter === "applied" && !drive.alreadyApplied) return false;
    const text = `${drive.companyName} ${drive.jobRole}`.toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }), [filter, query.data, search]);
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError && !query.data) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;

  return <><Flex gap="3" justify="space-between" direction={{ base: "column", md: "row" }} mb="6"><Flex bg="white" border="1px solid" borderColor={colors.line} borderRadius="full" p="1" gap="1" aria-label="Drive filters">{(["open", "applied", "all"] as const).map((item) => <Button key={item} size="sm" borderRadius="full" variant={filter === item ? "solid" : "ghost"} bg={filter === item ? colors.ink : undefined} color={filter === item ? "white" : colors.muted} onClick={() => setFilter(item)} textTransform="capitalize">{item}</Button>)}</Flex><Box position="relative" w={{ base: "full", md: "290px" }}><Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color={colors.muted}><Search size={17} /></Box><Input value={search} onChange={(event) => setSearch(event.target.value)} pl="10" bg="white" placeholder="Search company or role" aria-label="Search drives" /></Box></Flex>{query.isRefetchError && <Box mb="5"><RefreshNotice onRetry={() => query.refetch()} /></Box>}{query.isFetching && !query.isLoading && <Flex justify="end" mb="3" color={colors.muted} fontSize="sm" gap="2"><Spinner size="xs" />Updating drives</Flex>}{drives.length ? <Grid templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }} gap="4">{drives.map((drive) => <DriveCard key={drive.id} drive={drive} />)}</Grid> : <EmptyState title={search ? "No matching drives" : filter === "applied" ? "You haven't applied to a drive yet" : "No placement drives are open right now"} description={search ? "Try a different company or role." : "New drives will appear here as soon as coordinators publish them."} />}</>;
}
