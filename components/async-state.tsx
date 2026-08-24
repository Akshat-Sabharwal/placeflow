import type { ReactNode } from "react";
import { Alert, Box, Button, Flex, Heading, Skeleton, Text } from "@chakra-ui/react";
import { Inbox, RefreshCcw, WifiOff } from "lucide-react";
import { colors } from "@/lib/ui/tokens";
import { getErrorMessage } from "@/lib/api-client/errors";

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return <Box aria-busy="true" aria-label="Loading content"><Skeleton h="34px" w="44%" borderRadius="md" mb="7" />{Array.from({ length: rows }, (_, i) => <Skeleton key={i} h="132px" borderRadius="18px" mb="4" />)}<Text srOnly>Loading content</Text></Box>;
}

export function EmptyState({ title, description, action, icon: Icon = Inbox }: { title: string; description: string; action?: ReactNode; icon?: typeof Inbox }) {
  return <Flex border="1px dashed" borderColor={colors.line} borderRadius="18px" minH="280px" bg="white" p="8" align="center" justify="center" textAlign="center" direction="column"><Box color={colors.signal} mb="5"><Icon size={30} /></Box><Heading as="h2" fontSize="xl">{title}</Heading><Text mt="2" color={colors.muted} maxW="430px">{description}</Text>{action && <Box mt="6">{action}</Box>}</Flex>;
}

export function ApiErrorAlert({ error, onRetry, title = "We couldn't load this yet." }: { error: unknown; onRetry?: () => void; title?: string }) {
  return <Alert.Root status="error" borderRadius="14px" border="1px solid" borderColor={colors.danger} bg={colors.dangerSoft} p="4"><Alert.Indicator /><Box flex="1"><Alert.Title>{title}</Alert.Title><Alert.Description>{getErrorMessage(error)}</Alert.Description></Box>{onRetry && <Button size="sm" variant="outline" onClick={onRetry}><RefreshCcw size={15} /> Retry</Button>}</Alert.Root>;
}

export function RefreshNotice({ onRetry }: { onRetry?: () => void }) {
  return <Flex role="status" bg={colors.warningSoft} color={colors.warning} borderRadius="md" px="3" py="2" align="center" gap="2" fontSize="sm"><WifiOff size={15} /> Could not refresh. Showing the last available information.{onRetry && <Button size="xs" variant="ghost" onClick={onRetry}>Retry</Button>}</Flex>;
}
