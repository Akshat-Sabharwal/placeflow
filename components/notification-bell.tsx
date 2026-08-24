"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Heading, Spinner, Text } from "@chakra-ui/react";
import { Bell, BellRing, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { getNotifications, markNotificationRead, registerPushSubscription } from "@/lib/api-client";
import { queryKeys } from "@/lib/queries/keys";
import { polling, whenVisible } from "@/lib/queries/polling";
import { formatDateTime } from "@/lib/ui/format";
import { colors } from "@/lib/ui/tokens";

function urlBase64ToUint8Array(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const raw = window.atob((value + padding).replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.notifications(), queryFn: getNotifications, refetchInterval: whenVisible(polling.notifications) });
  const readMutation = useMutation({ mutationFn: markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  const pushMutation = useMutation({
    mutationFn: async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") throw new Error("Push notifications are not supported in this browser.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Permission was not granted. In-app updates will continue to work.");
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push notifications are not configured yet.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("The browser returned an incomplete push subscription.");
      return registerPushSubscription({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } });
    },
    onSuccess: () => { setPushEnabled(true); toast.success("Placement notifications are enabled."); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not enable notifications."),
  });
  useEffect(() => {
    if (!("serviceWorker" in navigator) || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    void navigator.serviceWorker.getRegistration().then((registration) => registration?.pushManager.getSubscription()).then((subscription) => setPushEnabled(Boolean(subscription)));
  }, []);
  const unread = query.data?.filter((item) => !item.readAt).length ?? 0;

  return (
    <Box position="relative">
      <Button variant="ghost" size="sm" aria-label={`${unread} unread notifications`} onClick={() => setOpen((value) => !value)} position="relative">
        {unread ? <BellRing size={19} /> : <Bell size={19} />}
        {unread > 0 && <Box position="absolute" top="1" right="1" minW="17px" h="17px" borderRadius="full" bg={colors.signalDark} color={colors.paper} fontSize="10px" display="grid" placeItems="center">{unread > 9 ? "9+" : unread}</Box>}
      </Button>
      {open && (
        <Box role="dialog" aria-label="Notifications" position="absolute" right="0" top="48px" w={{ base: "calc(100vw - 32px)", sm: "390px" }} maxH="560px" overflowY="auto" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" boxShadow="var(--shadow-lg)" p="4" zIndex="40">
          <Flex justify="space-between" align="center" mb="4"><Heading as="h2" fontSize="lg">Notifications</Heading>{query.isFetching && <Spinner size="sm" aria-label="Updating notifications" />}</Flex>
          {query.isLoading ? <Spinner /> : query.data?.length ? (
            <Flex direction="column" gap="2">
              {query.data.map((item) => (
                <Box key={item.id} p="3" borderRadius="12px" bg={item.readAt ? colors.paper : colors.infoSoft} border="1px solid" borderColor={item.readAt ? colors.line : colors.info}>
                  <Link href={item.url} onClick={() => { setOpen(false); if (!item.readAt) readMutation.mutate(item.id); }}>
                    <Flex justify="space-between" gap="3"><Box><Text fontWeight="700" fontSize="sm">{item.title}</Text><Text fontSize="sm" color={colors.muted} mt="1">{item.body}</Text><Text fontSize="xs" color={colors.muted} mt="2">{formatDateTime(item.createdAt)}</Text></Box><ExternalLink size={15} /></Flex>
                  </Link>
                </Box>
              ))}
            </Flex>
          ) : <Text color={colors.muted}>No notifications yet.</Text>}
          <Box mt="4" pt="4" borderTop="1px solid" borderColor={colors.line}><Text fontWeight="700" fontSize="sm">Never miss a placement update</Text><Text fontSize="xs" color={colors.muted} mt="1">Push is optional. Your in-app updates always remain available.</Text><Button mt="3" size="sm" variant={pushEnabled ? "solid" : "outline"} bg={pushEnabled ? colors.successSoft : undefined} color={pushEnabled ? colors.success : colors.ink} onClick={() => !pushEnabled && pushMutation.mutate()} loading={pushMutation.isPending} disabled={pushEnabled}>{pushEnabled ? <><CheckCircle2 size={16} />Notifications enabled</> : "Enable notifications"}</Button></Box>
        </Box>
      )}
    </Box>
  );
}
