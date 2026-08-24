import { Badge, Flex } from "@chakra-ui/react";
import { CircleCheck, CircleX, Clock3, Dot, PauseCircle } from "lucide-react";
import { colors, statusTone } from "@/lib/ui/tokens";
import { titleCase } from "@/lib/ui/format";

const tones = {
  neutral: { bg: colors.paperDeep, color: colors.ink, icon: Dot },
  success: { bg: colors.successSoft, color: colors.success, icon: CircleCheck },
  warning: { bg: colors.warningSoft, color: colors.warning, icon: Clock3 },
  danger: { bg: colors.dangerSoft, color: colors.danger, icon: CircleX },
  info: { bg: colors.infoSoft, color: colors.info, icon: PauseCircle },
};

export function StatusBadge({ status }: { status: keyof typeof statusTone | string }) {
  const toneName = statusTone[status as keyof typeof statusTone] ?? "neutral";
  const tone = tones[toneName];
  const Icon = tone.icon;
  return <Badge bg={tone.bg} color={tone.color} borderRadius="full" px="2.5" py="1" textTransform="none"><Flex align="center" gap="1.5"><Icon size={13} aria-hidden="true" />{titleCase(status)}</Flex></Badge>;
}
