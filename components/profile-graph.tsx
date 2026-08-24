"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { Hand, UsersRound } from "lucide-react";
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
  const query = useQuery({ queryKey: queryKeys.profileGraph, queryFn: getProfileGraph });
  const visibleGraph = useMemo(() => {
    const graph = query.data;
    if (!graph) return { nodes: [], edges: [] };
    const viewer = graph.nodes.find((node) => node.isViewer);
    if (!viewer) return { nodes: [], edges: [] };
    const directIds = new Set([viewer.id]);
    graph.edges.forEach((edge) => {
      if (edge.source === viewer.id) directIds.add(edge.target);
      if (edge.target === viewer.id) directIds.add(edge.source);
    });
    return { nodes: graph.nodes.filter((node) => directIds.has(node.id)), edges: graph.edges.filter((edge) => (edge.source === viewer.id || edge.target === viewer.id) && directIds.has(edge.source) && directIds.has(edge.target)) };
  }, [query.data]);

  if (query.isLoading) return <Flex minH="480px" align="center" justify="center"><Spinner /></Flex>;
  if (query.isError || !query.data) return <ApiErrorAlert error={query.error ?? new Error("Graph could not be loaded")} onRetry={() => query.refetch()} />;
  const graphKey = `${visibleGraph.nodes.map((node) => node.id).join(":")}|${visibleGraph.edges.map((edge) => `${edge.source}-${edge.target}`).join(":")}`;
  return <GraphCanvas key={graphKey} graph={visibleGraph} />;
}

function GraphCanvas({ graph: visibleGraph }: { graph: ProfileGraphDTO }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const viewer = visibleGraph.nodes.find((node) => node.isViewer);
  const [selectedId, setSelectedId] = useState<string | null>(viewer?.id ?? null);
  const [positions, setPositions] = useState<Map<string, Point>>(() => createPositions(visibleGraph.nodes));
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const selected = visibleGraph.nodes.find((node) => node.id === selectedId) ?? visibleGraph.nodes.find((node) => node.isViewer) ?? null;

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
      <Flex position="absolute" top="4" left="4" zIndex="1" align="center" gap="2" bg={colors.header} border="1px solid" borderColor={colors.line} borderRadius="full" px="3" py="2" fontSize="sm" color={colors.muted}><Hand size={15} />Drag nodes · drag the canvas to pan</Flex>
      <svg ref={svgRef} role="img" aria-label="Your direct public profile connections" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: "100%", minWidth: 680, height: 570, touchAction: "none", cursor: interaction?.kind === "pan" ? "grabbing" : "grab" }} onPointerMove={pointerMove} onPointerUp={() => setInteraction(null)} onPointerCancel={() => setInteraction(null)}>
        <defs><pattern id="graph-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.4" fill={colors.line} /></pattern></defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#graph-dots)" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ kind: "pan", x: event.clientX, y: event.clientY, origin: pan }); }} />
        <g transform={`translate(${pan.x} ${pan.y})`}>
          {visibleGraph.edges.map((edge) => { const source = positions.get(edge.source); const target = positions.get(edge.target); if (!source || !target) return null; return <line key={`${edge.source}-${edge.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke={colors.lineStrong ?? colors.line} strokeWidth={Math.min(5, 1.5 + edge.sharedGroups)} opacity=".82" />; })}
          {visibleGraph.nodes.map((node) => {
            const point = positions.get(node.id); if (!point) return null;
            const active = selected?.id === node.id;
            return <g key={node.id} className="graph-node" role="button" tabIndex={0} aria-label={`${node.label}, ${node.role}`} onClick={() => setSelectedId(node.id)} onFocus={() => setSelectedId(node.id)} onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setInteraction({ kind: "node", id: node.id, x: event.clientX, y: event.clientY, origin: point }); setSelectedId(node.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); } }} style={{ cursor: interaction?.kind === "node" && interaction.id === node.id ? "grabbing" : "grab" }}>
              <circle cx={point.x} cy={point.y} r={node.isViewer ? 35 : 28} fill={node.isViewer ? colors.signal : active ? colors.infoSoft : colors.surface} stroke={active ? colors.info : colors.ink} strokeWidth={active ? 4 : 2} />
              <text x={point.x} y={point.y + 4} textAnchor="middle" fill={colors.ink} fontSize={node.isViewer ? 14 : 12} fontWeight="800" pointerEvents="none">{initials(node.label)}</text>
              <text x={point.x} y={point.y + (node.isViewer ? 55 : 46)} textAnchor="middle" fill={colors.ink} fontSize="12" fontWeight="700" pointerEvents="none">{truncate(node.label, 20)}</text>
            </g>;
          })}
        </g>
      </svg>
    </Box>
    <Box w={{ base: "full", xl: "290px" }}><Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="6" position={{ xl: "sticky" }} top="92px">{selected ? <ProfileSummary node={selected} /> : <><UsersRound size={28} /><Heading as="h2" fontSize="lg" mt="4">No direct neighbors yet</Heading><Text color={colors.muted} mt="2">Join a public group with another public profile to create a visible connection.</Text></>}</Box><Box mt="4" p="4" border="1px dashed" borderColor={colors.line} borderRadius="14px"><Text fontSize="sm" color={colors.muted}>{Math.max(0, visibleGraph.nodes.length - 1)} direct neighbors · {visibleGraph.edges.length} visible relationships</Text></Box></Box>
  </Flex>;
}

function createPositions(nodes: ProfileGraphNodeDTO[]) {
  const viewer = nodes.find((node) => node.isViewer);
  const neighbors = nodes.filter((node) => !node.isViewer);
  const positions = new Map<string, Point>();
  if (viewer) positions.set(viewer.id, { x: WIDTH / 2, y: HEIGHT / 2 });
  neighbors.forEach((node, index) => {
    const baseAngle = (index / Math.max(1, neighbors.length)) * Math.PI * 2;
    const angle = baseAngle + (seeded(`${node.id}:angle`) - 0.5) * 0.72;
    const radius = 165 + seeded(`${node.id}:radius`) * 165;
    positions.set(node.id, { x: WIDTH / 2 + Math.cos(angle) * radius, y: HEIGHT / 2 + Math.sin(angle) * radius * 0.68 });
  });
  return positions;
}

function ProfileSummary({ node }: { node: ProfileGraphNodeDTO }) {
  return <><Box w="54px" h="54px" bg={node.isViewer ? colors.signal : colors.signalSoft} borderRadius="full" display="grid" placeItems="center" fontWeight="900" fontSize="lg">{initials(node.label)}</Box><Heading as="h2" fontSize="xl" mt="4">{node.label}{node.isViewer ? " (you)" : ""}</Heading><Text color={colors.signalDark} fontSize="sm" fontWeight="800" textTransform="capitalize" mt="1">{node.role}</Text><Flex direction="column" gap="2" mt="5" color={colors.muted} fontSize="sm"><Text>{node.branch ?? "Branch not listed"}</Text><Text>{node.graduationYear ? `Class of ${node.graduationYear}` : "Graduation year not listed"}</Text><Text>{node.groupCount} visible public groups</Text></Flex></>;
}

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const truncate = (value: string, max: number) => value.length > max ? `${value.slice(0, max - 1)}…` : value;
