import type { ReactNode } from "react";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { colors } from "@/lib/ui/tokens";

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <Flex justify="space-between" align={{ base: "start", md: "end" }} direction={{ base: "column", md: "row" }} gap="5" mb="8"><Box>{eyebrow && <Text color={colors.signalText} fontWeight="800" textTransform="uppercase" letterSpacing=".08em" fontSize="xs" mb="2">{eyebrow}</Text>}<Heading as="h1" fontSize={{ base: "3xl", md: "4xl" }} letterSpacing="-.04em">{title}</Heading>{description && <Text color={colors.muted} mt="2" maxW="680px">{description}</Text>}</Box>{actions}</Flex>;
}
