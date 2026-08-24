import Link from "next/link";
import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { ArrowRight, CalendarDays, MapPin, WalletCards } from "lucide-react";
import type { DriveDTO } from "@/lib/contracts/domain";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/ui/format";
import { colors } from "@/lib/ui/tokens";

export function DriveCard({ drive, coordinator = false }: { drive: DriveDTO; coordinator?: boolean }) {
  const href = coordinator ? `/coordinator/drives/${drive.id}` : `/student/drives/${drive.id}`;
  return <Link href={href} aria-label={`${coordinator ? "Manage" : "View"} ${drive.jobRole} at ${drive.companyName}`} style={{ display: "block", height: "100%" }}><Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="5" h="full" transition="transform .15s ease, border-color .15s ease, box-shadow .15s ease" _hover={{ transform: "translateY(-3px)", borderColor: colors.signal, boxShadow: "var(--shadow-sm)" }} _focusWithin={{ borderColor: colors.focus, boxShadow: `0 0 0 2px ${colors.focus}` }}><Flex justify="space-between" align="start" gap="4"><Box><Text color={colors.muted} fontSize="sm" fontWeight="700">{drive.companyName}</Text><Heading as="h2" fontSize="xl" mt="1">{drive.jobRole}</Heading></Box><StatusBadge status={drive.status} /></Flex><Flex mt="5" direction="column" gap="2" color={colors.muted} fontSize="sm"><Flex gap="2" align="center"><CalendarDays size={15} />Apply by {formatDateTime(drive.registrationDeadline)}</Flex>{drive.location && <Flex gap="2" align="center"><MapPin size={15} />{drive.location}</Flex>}{drive.packageText && <Flex gap="2" align="center"><WalletCards size={15} />{drive.packageText}</Flex>}</Flex><Flex mt="6" align="center" justify="space-between">{coordinator ? <Text fontSize="sm" color={colors.muted}>{drive.applicationCount ?? 0} applications</Text> : drive.alreadyApplied ? <StatusBadge status="applied" /> : drive.eligibility ? <Text fontWeight="700" fontSize="sm" color={drive.eligibility.eligible ? colors.success : colors.warning}>{drive.eligibility.eligible ? "Eligible to apply" : "Check eligibility"}</Text> : <Box />}<Flex align="center" gap="1" fontWeight="700" fontSize="sm">{coordinator ? "Manage" : "View drive"}<ArrowRight size={15} /></Flex></Flex></Box></Link>;
}
