import Link from "next/link";
import { Box, Flex, Text } from "@chakra-ui/react";
import { colors } from "@/lib/ui/tokens";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <Link href="/" aria-label="PlaceFlow home"><Flex align="center" gap="3"><Box aria-hidden="true" w="28px" h="28px" position="relative"><Box position="absolute" inset="0" border="2px solid" borderColor={colors.ink} borderRadius="full" /><Box position="absolute" right="-1px" bottom="-1px" w="13px" h="13px" bg={colors.signal} borderRadius="2px" /></Box>{!compact && <Text fontWeight="800" fontSize="lg" letterSpacing="-.03em">PlaceFlow</Text>}</Flex></Link>;
}
