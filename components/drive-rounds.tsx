"use client";

import { useState } from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { CircleCheck, CircleDot } from "lucide-react";
import type { DriveRoundDTO } from "@/lib/contracts/domain";
import { colors } from "@/lib/ui/tokens";

export function DriveRounds({
  rounds,
  activeRoundIndex,
  canActivate = false,
  pending = false,
  onActivate,
}: {
  rounds: DriveRoundDTO[];
  activeRoundIndex: number | null;
  canActivate?: boolean;
  pending?: boolean;
  onActivate?: (index: number) => void;
}) {
  const [selected, setSelected] = useState(activeRoundIndex ?? 0);
  if (!rounds.length) return null;
  const current = rounds[selected] ?? rounds[0];

  return <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "4", md: "5" }}>
    <Flex justify="space-between" align="center" mb="3" gap="3" wrap="wrap">
      <Text fontWeight="800">Drive rounds</Text>
      <Text fontSize="sm" color={activeRoundIndex === null ? colors.muted : colors.signalText}>
        {activeRoundIndex === null ? "Process not started" : `Active: ${activeRoundIndex + 1}. ${rounds[activeRoundIndex]?.name ?? "Round"}`}
      </Text>
    </Flex>
    <Flex gap="2" overflowX="auto" pb="2" role="tablist" aria-label="Drive rounds">
      {rounds.map((round, index) => {
        const active = index === activeRoundIndex;
        const completed = activeRoundIndex !== null && index < activeRoundIndex;
        return <Button key={`${round.name}-${index}`} role="tab" aria-selected={selected === index} flexShrink="0" variant="outline" borderColor={selected === index ? colors.signal : colors.line} bg={active ? colors.signalSoft : selected === index ? colors.paperDeep : colors.surface} color={active ? colors.signalText : colors.ink} onClick={() => setSelected(index)}>
          {completed ? <CircleCheck size={16} /> : active ? <CircleDot size={16} /> : null}
          {index + 1}. {round.name}
        </Button>;
      })}
    </Flex>
    <Flex mt="3" justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap="3">
      <Text color={colors.muted}>{current.description || (selected === activeRoundIndex ? "This is the active stage of the drive." : "No description was provided for this round.")}</Text>
      {canActivate && selected !== activeRoundIndex && <Button size="sm" bg={colors.signal} color={colors.onSignal} _hover={{ bg: colors.signalDark }} _active={{ bg: colors.signalDark }} loading={pending} onClick={() => onActivate?.(selected)}>Set as active round</Button>}
    </Flex>
  </Box>;
}
