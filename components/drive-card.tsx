"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react";
import { ArrowRight, CalendarDays, MapPin, Pin, WalletCards } from "lucide-react";
import { toast } from "sonner";
import type { DriveDTO } from "@/lib/contracts/domain";
import { setDrivePinned } from "@/lib/api-client/drives";
import { queryKeys } from "@/lib/queries/keys";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime } from "@/lib/ui/format";
import { colors } from "@/lib/ui/tokens";

export function DriveCard({ drive, coordinator = false }: { drive: DriveDTO; coordinator?: boolean }) {
  const href = coordinator ? `/coordinator/drives/${drive.id}` : `/student/drives/${drive.id}`;
  const queryClient = useQueryClient();
  const pinMutation = useMutation({
    mutationFn: () => setDrivePinned(drive.id, !drive.pinned),
    onSuccess: async ({ pinned }) => {
      toast.success(pinned ? "Job pinned." : "Job unpinned.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drives"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.drive(drive.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard }),
      ]);
    },
    onError: () => toast.error("The pin could not be updated."),
  });
  const eligibilityText = drive.eligibility?.eligible ? "Eligible" : "Not eligible";

  return (
    <Box
      data-drive-card={drive.id}
      bg={colors.surface}
      border="1px solid"
      borderColor={colors.line}
      borderRadius="18px"
      p="5"
      h="full"
      transition="transform .15s ease, border-color .15s ease, box-shadow .15s ease"
      _hover={{ transform: "translateY(-3px)", borderColor: colors.signal, boxShadow: "var(--shadow-sm)" }}
      _focusWithin={{ borderColor: colors.focus, boxShadow: `0 0 0 2px ${colors.focus}` }}
    >
      <Flex justify="space-between" align="start" gap="4">
        <Link href={href} aria-label={`${coordinator ? "Manage" : "View"} ${drive.jobRole} at ${drive.companyName}`}>
          <Text color={colors.muted} fontSize="sm" fontWeight="700">{drive.companyName}</Text>
          <Heading as="h2" fontSize="xl" mt="1">{drive.jobRole}</Heading>
        </Link>
        <Flex gap="2" align="center">
          <StatusBadge status={drive.status} />
          {!coordinator && (
            <Button
              size="sm"
              variant={drive.pinned ? "solid" : "outline"}
              bg={drive.pinned ? colors.signal : undefined}
              color={drive.pinned ? colors.onSignal : colors.muted}
              _hover={{
                bg: drive.pinned ? colors.signalDark : colors.paperDeep,
                color: drive.pinned ? colors.onSignal : colors.ink,
              }}
              _active={{ bg: drive.pinned ? colors.signalDark : colors.paperDeep }}
              aria-label={drive.pinned ? "Unpin job" : "Pin job"}
              title={drive.pinned ? "Unpin job" : "Pin job"}
              loading={pinMutation.isPending}
              onClick={() => pinMutation.mutate()}
            >
              <Pin size={15} fill={drive.pinned ? "currentColor" : "none"} />
            </Button>
          )}
        </Flex>
      </Flex>
      <Link href={href} style={{ display: "block" }}>
        <Flex mt="5" direction="column" gap="2" color={colors.muted} fontSize="sm">
          <Flex gap="2" align="center"><CalendarDays size={15} />Apply by {formatDateTime(drive.registrationDeadline)}</Flex>
          {drive.location && <Flex gap="2" align="center"><MapPin size={15} />{drive.location}</Flex>}
          {drive.packageText && <Flex gap="2" align="center"><WalletCards size={15} />{drive.packageText}</Flex>}
        </Flex>
        <Flex mt="6" align="center" justify="space-between" gap="4">
          {coordinator ? (
            <Text fontSize="sm" color={colors.muted}>{drive.applicationCount ?? 0} applications</Text>
          ) : drive.alreadyApplied ? (
            <StatusBadge status="applied" />
          ) : drive.eligibility ? (
            <Text fontWeight="700" fontSize="sm" color={drive.eligibility.eligible ? colors.success : colors.warning}>
              {eligibilityText}
            </Text>
          ) : <Box />}
          <Flex align="center" gap="1" fontWeight="700" fontSize="sm" flexShrink="0">
            {coordinator ? "Manage" : "View drive"}<ArrowRight size={15} />
          </Flex>
        </Flex>
      </Link>
    </Box>
  );
}
