import { Box, Flex, Heading, Text } from "@chakra-ui/react";
import { CheckCircle2, CircleX } from "lucide-react";
import type { EligibilityReason } from "@/lib/contracts/domain";
import { colors } from "@/lib/ui/tokens";

const reasonCopy: Record<EligibilityReason, string> = {
  PROFILE_INCOMPLETE: "Complete your placement profile.", DRIVE_NOT_OPEN: "This drive is not accepting applications.", DEADLINE_PASSED: "The registration deadline has passed.", BRANCH_NOT_ELIGIBLE: "Your branch is not included for this drive.", YEAR_NOT_ELIGIBLE: "Your graduation year is not included for this drive.", CGPA_TOO_LOW: "Your CGPA is below the required minimum.", TOO_MANY_BACKLOGS: "Your backlog count is above the allowed maximum.",
};

export function EligibilityPanel({ eligible, reasons }: { eligible: boolean; reasons: EligibilityReason[] }) {
  return <Box border="1px solid" borderColor={eligible ? "#9CCFB9" : "#E8C270"} bg={eligible ? colors.successSoft : colors.warningSoft} borderRadius="16px" p="5"><Flex align="center" gap="3" color={eligible ? colors.success : colors.warning}>{eligible ? <CheckCircle2 size={22} /> : <CircleX size={22} />}<Heading as="h2" fontSize="lg">{eligible ? "You meet the eligibility rules" : "Not eligible right now"}</Heading></Flex>{reasons.length > 0 && <Flex as="ul" direction="column" gap="2" mt="4" pl="5">{reasons.map((reason) => <Text as="li" key={reason} color={colors.ink}>{reasonCopy[reason]}</Text>)}</Flex>}</Box>;
}
