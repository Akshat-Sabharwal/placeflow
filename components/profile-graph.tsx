"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { Network, UsersRound } from "lucide-react";
import type { ProfileGraphNodeDTO } from "@/lib/contracts/domain";
import { getProfileGraph } from "@/lib/api-client/profile-graph";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { ApiErrorAlert } from "@/components/async-state";

const WIDTH = 920;
const HEIGHT = 570;

export function ProfileGraph() {
  const query = useQuery({ queryKey: queryKeys.profileGraph, queryFn: getProfileGraph });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const positions = useMemo(() => {
    const nodes = query.data?.nodes ?? [];
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    return new Map(nodes.map((node) => {
      if (node.isViewer) return [node.id, { x: centerX, y: centerY }];
      const others = nodes.filter((item) => !item.isViewer);
      const otherIndex = others.findIndex((item) => item.id === node.id);
      const ring = otherIndex % 2;
      const count = Math.max(1, others.filter((_, i) => i % 2 === ring).length);
      const ringIndex = Math.floor(otherIndex / 2);
      const angle = (ringIndex / count) * Math.PI * 2 - Math.PI / 2;
      const radiusX = ring ? 360 : 235;
      const radiusY = ring ? 225 : 150;
      return [node.id, { x: centerX + Math.cos(angle) * radiusX, y: centerY + Math.sin(angle) * radiusY }];
    }));
  }, [query.data]);
  if (query.isLoading) return <Flex minH="480px" align="center" justify="center"><Spinner /></Flex>;
  if (query.isError || !query.data) return <ApiErrorAlert error={query.error ?? new Error("Graph could not be loaded")} onRetry={() => query.refetch()} />;
  const selected = query.data.nodes.find((node) => node.id === selectedId) ?? query.data.nodes.find((node) => node.isViewer) ?? null;
  return <Flex gap="5" direction={{ base: "column", xl: "row" }}>
    <Box flex="1" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" overflow="hidden" minH="480px" position="relative"><Flex position="absolute" top="4" left="4" zIndex="1" align="center" gap="2" bg={colors.header} border="1px solid" borderColor={colors.line} borderRadius="full" px="3" py="2" fontSize="sm" color={colors.muted}><Network size={16} />Lines represent shared public groups</Flex><Box overflowX="auto"><svg role="img" aria-label="Related public profile graph" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ minWidth: 720, width: "100%", height: 570 }}><g>{query.data.edges.map((edge) => { const source = positions.get(edge.source); const target = positions.get(edge.target); if (!source || !target) return null; return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={colors.line} strokeWidth={Math.min(5, 1 + edge.sharedGroups)} opacity=".9" />; })}</g><g>{query.data.nodes.map((node) => { const point = positions.get(node.id); if (!point) return null; const active = selected?.id === node.id; return <g key={node.id} role="button" tabIndex={0} aria-label={`${node.label}, ${node.role}`} onClick={() => setSelectedId(node.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelectedId(node.id); }} style={{ cursor: "pointer", outline: "none" }}><circle cx={point.x} cy={point.y} r={node.isViewer ? 34 : 27} fill={node.isViewer ? colors.signal : active ? colors.infoSoft : colors.surface} stroke={active ? colors.info : colors.ink} strokeWidth={active ? 4 : 2} /><text x={point.x} y={point.y + 4} textAnchor="middle" fill={node.isViewer ? colors.ink : colors.ink} fontSize={node.isViewer ? 14 : 12} fontWeight="800">{initials(node.label)}</text><text x={point.x} y={point.y + (node.isViewer ? 54 : 45)} textAnchor="middle" fill={colors.ink} fontSize="12" fontWeight="700">{truncate(node.label, 20)}</text></g>; })}</g></svg></Box></Box>
    <Box w={{ base: "full", xl: "290px" }}><Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="6" position={{ xl: "sticky" }} top="92px">{selected ? <ProfileSummary node={selected} /> : <><UsersRound size={28} /><Heading as="h2" fontSize="lg" mt="4">No public profiles yet</Heading><Text color={colors.muted} mt="2">Profiles appear after members make them public in settings.</Text></>}</Box><Box mt="4" p="4" border="1px dashed" borderColor={colors.line} borderRadius="14px"><Text fontSize="sm" color={colors.muted}>{query.data.nodes.length} public profiles · {query.data.edges.length} visible relationships</Text></Box></Box>
  </Flex>;
}

function ProfileSummary({ node }: { node: ProfileGraphNodeDTO }) {
  return <><Box w="54px" h="54px" bg={node.isViewer ? colors.signal : colors.signalSoft} borderRadius="full" display="grid" placeItems="center" fontWeight="900" fontSize="lg">{initials(node.label)}</Box><Heading as="h2" fontSize="xl" mt="4">{node.label}{node.isViewer ? " (you)" : ""}</Heading><Text color={colors.signalDark} fontSize="sm" fontWeight="800" textTransform="capitalize" mt="1">{node.role}</Text><Flex direction="column" gap="2" mt="5" color={colors.muted} fontSize="sm"><Text>{node.branch ?? "Branch not listed"}</Text><Text>{node.graduationYear ? `Class of ${node.graduationYear}` : "Graduation year not listed"}</Text><Text>{node.groupCount} visible public groups</Text></Flex></>;
}

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const truncate = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
