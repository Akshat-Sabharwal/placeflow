"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Flex, Heading, Input, Spinner, Text } from "@chakra-ui/react";
import { Hand, Search, UsersRound } from "lucide-react";
import type { ProfileGraphDTO, ProfileGraphNodeDTO } from "@/lib/contracts/domain";
import { getProfileGraph } from "@/lib/api-client/profile-graph";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { ApiErrorAlert } from "@/components/async-state";

const WIDTH = 920;
const HEIGHT = 570;
type Point = { x: number; y: number };
type Interaction = { kind: "pan"; x: number; y: number; origin: Point } | { kind: "node"; id: string; x: number; y: number; origin: Point };

function seeded(value: string) {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0) / 4294967295;
}

export function ProfileGraph() {
  const [search, setSearch] = useState("");
  const query = useQuery({ queryKey: queryKeys.profileGraph, queryFn: getProfileGraph });
  const visibleGraph = useMemo(() => {
    const graph = query.data;
    if (!graph) return { nodes: [], edges: [], groups: [] };
    const viewer = graph.nodes.find((node) => node.isViewer);
    if (!viewer) return { nodes: [], edges: [], groups: [] };
    const directIds = new Set([viewer.id]);
    graph.edges.forEach((edge) => {
      if (edge.source === viewer.id) directIds.add(edge.target);
      if (edge.target === viewer.id) directIds.add(edge.source);
    });
    return {
      nodes: graph.nodes.filter((node) => directIds.has(node.id)),
      edges: graph.edges.filter((edge) => (edge.source === viewer.id || edge.target === viewer.id) && directIds.has(edge.source) && directIds.has(edge.target)),
      groups: graph.groups.filter((group) => group.memberIds.some((id) => id !== viewer.id && directIds.has(id))),
    };
  }, [query.data]);

  if (query.isLoading) return <Flex minH="480px" align="center" justify="center"><Spinner /></Flex>;
  if (query.isError || !query.data) return <ApiErrorAlert error={query.error ?? new Error("Graph could not be loaded")} onRetry={() => query.refetch()} />;
  const graphKey = `${visibleGraph.nodes.map((node) => node.id).join(":")}|${visibleGraph.edges.map((edge) => `${edge.source}-${edge.target}`).join(":")}`;
  return <GraphCanvas key={graphKey} graph={visibleGraph} search={search} onSearch={setSearch} />;
}

function GraphCanvas({ graph: visibleGraph, search, onSearch }: { graph: ProfileGraphDTO; search: string; onSearch: (value: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewer = visibleGraph.nodes.find((node) => node.isViewer);
  const [selectedId, setSelectedId] = useState<string | null>(viewer?.id ?? null);
  const [positions, setPositions] = useState<Map<string, Point>>(() => createPositions(visibleGraph));
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const selected = visibleGraph.nodes.find((node) => node.id === selectedId) ?? visibleGraph.nodes.find((node) => node.isViewer) ?? null;
  const needle = search.trim().toLowerCase();
  const matchingIds = new Set(visibleGraph.nodes.filter((node) => !needle || `${node.label} ${node.role} ${node.branch ?? ""}`.toLowerCase().includes(needle)).map((node) => node.id));
  const regions = groupRegions(visibleGraph, positions);

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!interaction) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (event.clientX - interaction.x) * (WIDTH / rect.width);
    const dy = (event.clientY - interaction.y) * (HEIGHT / rect.height);
    if (interaction.kind === "pan") setPan({ x: interaction.origin.x + dx, y: interaction.origin.y + dy });
    else setPositions((current) => { const next = new Map(current); next.set(interaction.id, { x: interaction.origin.x + dx, y: interaction.origin.y + dy }); return next; });
  }

  return <Flex gap="5" direction={{ base: "column", xl: "row" }}>
    <Box flex="1" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" overflow="hidden" minH="480px" position="relative">
      <Flex position="absolute" top="4" left="4" right="4" zIndex="1" align={{ base: "stretch", md: "center" }} justify="space-between" gap="2" direction={{ base: "column", md: "row" }}>
        <Flex align="center" gap="2" bg={colors.header} border="1px solid" borderColor={colors.line} borderRadius="full" px="3" py="2" fontSize="sm" color={colors.muted}><Hand size={15} />Drag nodes · drag the canvas to pan</Flex>
        <Box position="relative" w={{ base: "full", md: "260px" }}>
          <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color={colors.muted}><Search size={15} /></Box>
          <Input size="sm" bg={colors.header} borderRadius="full" pl="9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search people" aria-label="Search people in graph" />
        </Box>
      </Flex>
      <svg ref={svgRef} role="img" aria-label="Your direct public profile connections" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: "100%", minWidth: 680, height: 570, touchAction: "none", cursor: interaction?.kind === "pan" ? "grabbing" : "grab" }} onPointerMove={pointerMove} onPointerUp={() => setInteraction(null)} onPointerCancel={() => setInteraction(null)}>
        <defs><pattern id="graph-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill={colors.line} /></pattern></defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#graph-dots)" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ kind: "pan", x: event.clientX, y: event.clientY, origin: pan }); }} />
        <g transform={`translate(${pan.x} ${pan.y})`}>
          {regions.map((region) => {
            const tone = groupTones[region.index % groupTones.length];
            return <g key={region.id} pointerEvents="none"><rect x={region.x} y={region.y} width={region.width} height={region.height} rx="36" fill={tone.fill} fillOpacity=".52" stroke={tone.stroke} strokeWidth="2" strokeDasharray="7 5" /><text x={region.x + 14} y={region.y + 22} fill={tone.stroke} fontSize="12" fontWeight="800">{truncate(region.name, 28)}</text></g>;
          })}
          {visibleGraph.edges.map((edge) => { const source = positions.get(edge.source); const target = positions.get(edge.target); if (!source || !target) return null; return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={colors.lineStrong ?? colors.line} strokeWidth={Math.min(5, 1.5 + edge.sharedGroups)} opacity=".82" />; })}
          {visibleGraph.nodes.map((node) => {
            const point = positions.get(node.id); if (!point) return null;
            const active = selected?.id === node.id;
            const matches = matchingIds.has(node.id);
            return <g key={node.id} className="graph-node" role="button" tabIndex={0} aria-label={`${node.label}, ${node.role}`} onClick={() => setSelectedId(node.id)} onFocus={() => setSelectedId(node.id)} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ kind: "node", id: node.id, x: event.clientX, y: event.clientY, origin: point }); setSelectedId(node.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); } }} style={{ cursor: interaction?.kind === "node" && interaction.id === node.id ? "grabbing" : "grab" }}>
              <circle cx={point.x} cy={point.y} r={node.isViewer ? 35 : 28} fill={node.isViewer ? colors.signal : active ? colors.infoSoft : colors.surface} stroke={active ? colors.info : colors.ink} strokeWidth={active ? 4 : 2} opacity={matches ? 1 : .24} />
              <text x={point.x} y={point.y + 4} textAnchor="middle" fill={node.isViewer ? colors.onSignal : colors.ink} fontSize={node.isViewer ? 14 : 12} fontWeight="800" pointerEvents="none" opacity={matches ? 1 : .24}>{initials(node.label)}</text>
              <text x={point.x} y={point.y + (node.isViewer ? 55 : 46)} textAnchor="middle" fill={colors.ink} fontSize="12" fontWeight="700" pointerEvents="none" opacity={matches ? 1 : .24}>{truncate(node.label, 20)}</text>
            </g>;
          })}
        </g>
      </svg>
    </Box>
    <Box w={{ base: "full", xl: "290px" }}><Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="6" position={{ xl: "sticky" }} top="92px">{selected ? <ProfileSummary node={selected} groups={visibleGraph.groups.filter((group) => group.memberIds.includes(selected.id))} /> : <><UsersRound size={28} /><Heading as="h2" fontSize="lg" mt="4">No direct neighbors yet</Heading><Text color={colors.muted} mt="2">Join a public group with another public profile to create a visible connection.</Text></>}</Box><Box mt="4" p="4" border="1px dashed" borderColor={colors.line} borderRadius="14px"><Text fontSize="sm" color={colors.muted}>{Math.max(0, visibleGraph.nodes.length - 1)} direct neighbors · {visibleGraph.groups.length} visible communities</Text></Box></Box>
  </Flex>;
}

function createPositions(graph: ProfileGraphDTO) {
  const viewer = graph.nodes.find((node) => node.isViewer);
  const neighbors = graph.nodes.filter((node) => !node.isViewer);
  const positions = new Map<string, Point>();
  if (viewer) positions.set(viewer.id, { x: WIDTH / 2, y: HEIGHT / 2 });
  const assigned = new Set<string>();
  graph.groups.forEach((group, groupIndex) => {
    const members = group.memberIds.filter((id) => id !== viewer?.id && !assigned.has(id));
    if (!members.length) return;
    const groupAngle = (groupIndex / Math.max(1, graph.groups.length)) * Math.PI * 2 - Math.PI / 2;
    const groupRadius = graph.groups.length === 1 ? 205 : 225;
    const center = { x: WIDTH / 2 + Math.cos(groupAngle) * groupRadius, y: HEIGHT / 2 + Math.sin(groupAngle) * groupRadius * .68 };
    members.forEach((id, memberIndex) => {
      const angle = (memberIndex / Math.max(1, members.length)) * Math.PI * 2 + seeded(id) * .35;
      const radius = members.length === 1 ? 0 : 42 + seeded(`${id}:radius`) * 20;
      positions.set(id, { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
      assigned.add(id);
    });
  });
  neighbors.filter((node) => !assigned.has(node.id)).forEach((node, index, unassigned) => {
    const angle = (index / Math.max(1, unassigned.length)) * Math.PI * 2;
    positions.set(node.id, { x: WIDTH / 2 + Math.cos(angle) * 275, y: HEIGHT / 2 + Math.sin(angle) * 185 });
  });
  return positions;
}

function ProfileSummary({ node, groups }: { node: ProfileGraphNodeDTO; groups: ProfileGraphDTO["groups"] }) {
  return <><Box w="54px" h="54px" bg={node.isViewer ? colors.signal : colors.signalSoft} color={node.isViewer ? colors.onSignal : colors.ink} borderRadius="full" display="grid" placeItems="center" fontWeight="900" fontSize="lg">{initials(node.label)}</Box><Heading as="h2" fontSize="xl" mt="4">{node.label}{node.isViewer ? " (you)" : ""}</Heading><Text color={colors.signalText} fontSize="sm" fontWeight="800" textTransform="capitalize" mt="1">{node.role}</Text><Flex direction="column" gap="2" mt="5" color={colors.muted} fontSize="sm"><Text>{node.branch ?? "Branch not listed"}</Text><Text>{node.graduationYear ? `Class of ${node.graduationYear}` : "Graduation year not listed"}</Text><Text>{node.groupCount} visible public groups</Text></Flex>{groups.length > 0 && <Flex mt="4" gap="2" wrap="wrap">{groups.map((group) => <Text key={group.id} px="2" py="1" bg={colors.paperDeep} borderRadius="full" fontSize="xs" fontWeight="700">{group.name}</Text>)}</Flex>}</>;
}

const groupTones = [
  { fill: colors.signalSoft, stroke: colors.signalText },
  { fill: colors.infoSoft, stroke: colors.info },
  { fill: colors.successSoft, stroke: colors.success },
  { fill: colors.warningSoft, stroke: colors.warning },
  { fill: colors.dangerSoft, stroke: colors.danger },
];

function groupRegions(graph: ProfileGraphDTO, positions: Map<string, Point>) {
  return graph.groups.flatMap((group, index) => {
    const points = group.memberIds
      .filter((id) => !graph.nodes.find((node) => node.id === id)?.isViewer)
      .map((id) => positions.get(id))
      .filter((point): point is Point => Boolean(point));
    if (!points.length) return [];
    const minX = Math.min(...points.map((point) => point.x)) - 54;
    const maxX = Math.max(...points.map((point) => point.x)) + 54;
    const minY = Math.min(...points.map((point) => point.y)) - 52;
    const maxY = Math.max(...points.map((point) => point.y)) + 64;
    return [{ id: group.id, name: group.name, index, x: minX, y: minY, width: maxX - minX, height: maxY - minY }];
  });
}

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const truncate = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
