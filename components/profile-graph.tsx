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

const WIDTH = 1040;
const MIN_HEIGHT = 570;
type Point = { x: number; y: number };
type Interaction = { x: number; y: number; origin: Point };
type ProfilePlacement = { key: string; nodeId: string; x: number; y: number };
type CommunityRegion = { id: string; name: string; index: number; x: number; y: number; width: number; height: number; placements: ProfilePlacement[] };
type GraphLayout = { viewer: Point; regions: CommunityRegion[]; height: number };

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
  const graphKey = `${visibleGraph.nodes.map((node) => node.id).join(":")}|${visibleGraph.edges.map((edge) => `${edge.source}-${edge.target}`).join(":")}|${visibleGraph.groups.map((group) => `${group.id}:${group.memberIds.join(",")}`).join("|")}`;
  return <GraphCanvas key={graphKey} graph={visibleGraph} search={search} onSearch={setSearch} />;
}

function GraphCanvas({ graph: visibleGraph, search, onSearch }: { graph: ProfileGraphDTO; search: string; onSearch: (value: string) => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewer = visibleGraph.nodes.find((node) => node.isViewer);
  const [selectedId, setSelectedId] = useState<string | null>(viewer?.id ?? null);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const layout = useMemo(() => createGraphLayout(visibleGraph), [visibleGraph]);
  const nodesById = useMemo(() => new Map(visibleGraph.nodes.map((node) => [node.id, node])), [visibleGraph.nodes]);
  const selected = visibleGraph.nodes.find((node) => node.id === selectedId) ?? visibleGraph.nodes.find((node) => node.isViewer) ?? null;
  const needle = search.trim().toLowerCase();
  const matchingIds = new Set(visibleGraph.nodes.filter((node) => !needle || `${node.label} ${node.role} ${node.branch ?? ""}`.toLowerCase().includes(needle)).map((node) => node.id));

  function pointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!interaction) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (event.clientX - interaction.x) * (WIDTH / rect.width);
    const dy = (event.clientY - interaction.y) * (layout.height / rect.height);
    setPan({ x: interaction.origin.x + dx, y: interaction.origin.y + dy });
  }

  return <Flex gap="5" direction={{ base: "column", xl: "row" }}>
    <Box flex="1" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" overflowX="auto" overflowY="hidden" minH="480px" position="relative">
      <Flex position="absolute" top="4" left="4" right="4" zIndex="1" align={{ base: "stretch", md: "center" }} justify="space-between" gap="2" direction={{ base: "column", md: "row" }}>
        <Flex align="center" gap="2" bg={colors.header} border="1px solid" borderColor={colors.line} borderRadius="full" px="3" py="2" fontSize="sm" color={colors.muted}><Hand size={15} />Drag the canvas to pan · select a profile</Flex>
        <Box position="relative" w={{ base: "full", md: "260px" }}>
          <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color={colors.muted}><Search size={15} /></Box>
          <Input size="sm" bg={colors.header} borderRadius="full" pl="9" value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search people" aria-label="Search people in graph" />
        </Box>
      </Flex>
      <svg ref={svgRef} role="img" aria-label="Your direct public profile connections" viewBox={`0 0 ${WIDTH} ${layout.height}`} style={{ width: "100%", minWidth: 760, height: layout.height, touchAction: "none", cursor: interaction ? "grabbing" : "grab" }} onPointerMove={pointerMove} onPointerUp={() => setInteraction(null)} onPointerCancel={() => setInteraction(null)}>
        <defs><pattern id="graph-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill={colors.line} /></pattern></defs>
        <rect width={WIDTH} height={layout.height} fill="url(#graph-dots)" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ x: event.clientX, y: event.clientY, origin: pan }); }} />
        <g transform={`translate(${pan.x} ${pan.y})`}>
          {layout.regions.map((region) => {
            const tone = groupTones[region.index % groupTones.length];
            return <g key={`connection:${region.id}`} pointerEvents="none"><path d={`M ${layout.viewer.x} ${layout.viewer.y + 34} C ${layout.viewer.x} ${layout.viewer.y + 86}, ${region.x + region.width / 2} ${region.y - 34}, ${region.x + region.width / 2} ${region.y}`} fill="none" stroke={tone.stroke} strokeWidth="2" opacity=".58" /></g>;
          })}
          {layout.regions.map((region) => {
            const tone = groupTones[region.index % groupTones.length];
            return <g key={region.id}>
              <rect data-community-region={region.id} x={region.x} y={region.y} width={region.width} height={region.height} rx="24" fill={tone.fill} fillOpacity=".42" stroke={tone.stroke} strokeWidth="2" />
              <text x={region.x + 20} y={region.y + 29} fill={tone.stroke} fontSize="13" fontWeight="850" pointerEvents="none">{truncate(region.name, 34)}</text>
              <text x={region.x + region.width - 20} y={region.y + 29} textAnchor="end" fill={colors.muted} fontSize="11" fontWeight="700" pointerEvents="none">{region.placements.length} {region.placements.length === 1 ? "profile" : "profiles"}</text>
              {region.placements.map((placement) => {
                const node = nodesById.get(placement.nodeId); if (!node) return null;
                const active = selected?.id === node.id;
                const matches = matchingIds.has(node.id);
                return <g key={placement.key} className="graph-node" role="button" tabIndex={0} aria-label={`${node.label}, ${node.role}, in ${region.name}`} onClick={() => setSelectedId(node.id)} onFocus={() => setSelectedId(node.id)} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); } }} style={{ cursor: "pointer", opacity: matches ? 1 : .24 }}>
                  <rect data-profile-node-card={placement.key} x={placement.x} y={placement.y} width="132" height="58" rx="14" fill={active ? colors.infoSoft : colors.surface} stroke={active ? colors.info : colors.lineStrong} strokeWidth={active ? 3 : 1.5} />
                  <circle cx={placement.x + 25} cy={placement.y + 29} r="16" fill={active ? colors.info : colors.paperDeep} />
                  <text x={placement.x + 25} y={placement.y + 33} textAnchor="middle" fill={active ? colors.onSignal : colors.ink} fontSize="10" fontWeight="850" pointerEvents="none">{initials(node.label)}</text>
                  <text x={placement.x + 48} y={placement.y + 25} fill={colors.ink} fontSize="11" fontWeight="800" pointerEvents="none">{truncate(node.label, 13)}</text>
                  <text x={placement.x + 48} y={placement.y + 43} fill={colors.muted} fontSize="10" fontWeight="700" pointerEvents="none">{node.role}</text>
                </g>;
              })}
            </g>;
          })}
          {viewer && <g role="button" tabIndex={0} aria-label={`${viewer.label}, ${viewer.role}, you`} onClick={() => setSelectedId(viewer.id)} onFocus={() => setSelectedId(viewer.id)} onPointerDown={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(viewer.id); } }} style={{ cursor: "pointer", opacity: matchingIds.has(viewer.id) ? 1 : .24 }}>
            <rect data-viewer-node x={layout.viewer.x - 86} y={layout.viewer.y - 31} width="172" height="68" rx="20" fill={colors.signal} stroke={selected?.id === viewer.id ? colors.info : colors.signalText} strokeWidth={selected?.id === viewer.id ? 4 : 2} />
            <circle cx={layout.viewer.x - 52} cy={layout.viewer.y + 3} r="20" fill={colors.surface} />
            <text x={layout.viewer.x - 52} y={layout.viewer.y + 8} textAnchor="middle" fill={colors.ink} fontSize="11" fontWeight="900" pointerEvents="none">{initials(viewer.label)}</text>
            <text x={layout.viewer.x - 22} y={layout.viewer.y} fill={colors.onSignal} fontSize="12" fontWeight="850" pointerEvents="none">{truncate(viewer.label, 15)}</text>
            <text x={layout.viewer.x - 22} y={layout.viewer.y + 19} fill={colors.onSignal} fontSize="10" fontWeight="750" pointerEvents="none">You · {viewer.role}</text>
          </g>}
        </g>
      </svg>
    </Box>
    <Box w={{ base: "full", xl: "290px" }}><Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="6" position={{ xl: "sticky" }} top="92px">{selected ? <ProfileSummary node={selected} groups={visibleGraph.groups.filter((group) => group.memberIds.includes(selected.id))} /> : <><UsersRound size={28} /><Heading as="h2" fontSize="lg" mt="4">No direct neighbors yet</Heading><Text color={colors.muted} mt="2">Join a public group with another public profile to create a visible connection.</Text></>}</Box><Box mt="4" p="4" border="1px dashed" borderColor={colors.line} borderRadius="14px"><Text fontSize="sm" color={colors.muted}>{Math.max(0, visibleGraph.nodes.length - 1)} direct neighbors · {visibleGraph.groups.length} visible communities</Text></Box></Box>
  </Flex>;
}

export function createGraphLayout(graph: ProfileGraphDTO): GraphLayout {
  const viewer = graph.nodes.find((node) => node.isViewer);
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const viewerPoint = { x: WIDTH / 2, y: 100 };
  const outerPadding = 28;
  const columnGap = 28;
  const regionGap = 28;
  const regionWidth = (WIDTH - outerPadding * 2 - columnGap) / 2;
  const cardWidth = 132;
  const cardHeight = 58;
  const cardGapX = 14;
  const cardGapY = 14;
  const cardsPerRow = 3;
  const regionPaddingX = (regionWidth - cardsPerRow * cardWidth - (cardsPerRow - 1) * cardGapX) / 2;
  const regionHeader = 52;
  const regionPaddingBottom = 20;
  const visibleGroups = graph.groups
    .map((group) => ({ ...group, memberIds: group.memberIds.filter((id) => id !== viewer?.id && nodeIds.has(id)) }))
    .filter((group) => group.memberIds.length > 0);
  const groupedIds = new Set(visibleGroups.flatMap((group) => group.memberIds));
  const ungroupedIds = graph.nodes.filter((node) => !node.isViewer && !groupedIds.has(node.id)).map((node) => node.id);
  const communities = [
    ...visibleGroups,
    ...(ungroupedIds.length ? [{ id: "direct-connections", name: "Other direct connections", memberIds: ungroupedIds }] : []),
  ];
  const regionSpecs = communities.map((group, index) => {
    const rows = Math.ceil(group.memberIds.length / cardsPerRow);
    return { group, index, height: regionHeader + rows * cardHeight + Math.max(0, rows - 1) * cardGapY + regionPaddingBottom };
  });
  const regions: CommunityRegion[] = [];
  let y = 182;
  for (let index = 0; index < regionSpecs.length; index += 2) {
    const pair = regionSpecs.slice(index, index + 2);
    const rowHeight = Math.max(...pair.map((item) => item.height));
    pair.forEach((item, column) => {
      const x = outerPadding + column * (regionWidth + columnGap);
      const placements = item.group.memberIds.map((nodeId, memberIndex) => ({
        key: `${item.group.id}:${nodeId}`,
        nodeId,
        x: x + regionPaddingX + (memberIndex % cardsPerRow) * (cardWidth + cardGapX),
        y: y + regionHeader + Math.floor(memberIndex / cardsPerRow) * (cardHeight + cardGapY),
      }));
      regions.push({ id: item.group.id, name: item.group.name, index: item.index, x, y, width: regionWidth, height: item.height, placements });
    });
    y += rowHeight + regionGap;
  }
  return { viewer: viewerPoint, regions, height: Math.max(MIN_HEIGHT, y + 18) };
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

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const truncate = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
