"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Heading, Spinner, Text, Textarea } from "@chakra-ui/react";
import { ArrowLeft, Check, CornerUpLeft, LockKeyhole, Send, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import type { AppRole, CommunityMessageDTO } from "@/lib/contracts/domain";
import { getCommunity, moderateCommunityMember, sendCommunityMessage } from "@/lib/api-client/community";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { formatDateTime } from "@/lib/ui/format";
import { ApiErrorAlert, PageSkeleton } from "@/components/async-state";

export function CommunityRoom({ id, role }: { id: string; role: AppRole }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.community(id), queryFn: () => getCommunity(id), refetchInterval: 3000 });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityMessageDTO | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = query.data?.messages;
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages?.length]);
  const send = useMutation({
    mutationFn: () => sendCommunityMessage(id, { body: body.trim(), replyToId: replyTo?.id }),
    onSuccess: async () => { setBody(""); setReplyTo(null); await queryClient.invalidateQueries({ queryKey: queryKeys.community(id) }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Message could not be sent."),
  });
  const moderate = useMutation({
    mutationFn: (input: { userId: string; action: "approve" | "reject" }) => moderateCommunityMember(id, input),
    onSuccess: (detail) => { queryClient.setQueryData(queryKeys.community(id), detail); toast.success("Join request updated."); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Request could not be updated."),
  });
  if (query.isLoading) return <PageSkeleton rows={5} />;
  if (query.isError || !query.data) return <ApiErrorAlert error={query.error ?? new Error("Group not found")} onRetry={() => query.refetch()} />;
  const group = query.data;
  const canModerate = group.viewerStatus === "active" && Boolean(group.viewerRole && ["owner", "moderator"].includes(group.viewerRole));
  const pending = group.members.filter((member) => member.status === "pending");
  if (group.viewerStatus !== "active") return <Box><Button asChild variant="ghost" mb="5"><Link href={`/${role}/community`}><ArrowLeft size={16} />Back to groups</Link></Button><Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="8" textAlign="center"><LockKeyhole size={34} /><Heading mt="4">{group.name}</Heading><Text color={colors.muted} mt="2">{group.viewerStatus === "pending" ? "Your request is waiting for moderator approval." : "Join this group from the community directory to view its discussion."}</Text></Box></Box>;
  return <Box><Button asChild variant="ghost" mb="5"><Link href={`/${role}/community`}><ArrowLeft size={16} />Back to groups</Link></Button><Flex gap="5" align="stretch" direction={{ base: "column", lg: "row" }}><Flex direction="column" flex="1" minW="0" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" overflow="hidden" minH="70vh"><Flex p="5" borderBottom="1px solid" borderColor={colors.line} justify="space-between" align="center"><Box><Flex gap="2" align="center" color={colors.signalDark} fontSize="xs" fontWeight="800" textTransform="uppercase">{group.visibility === "private" ? <LockKeyhole size={13} /> : <UsersRound size={13} />}{group.visibility}</Flex><Heading as="h1" fontSize="2xl" mt="1">{group.name}</Heading></Box>{query.isFetching && <Spinner size="sm" aria-label="Refreshing messages" />}</Flex><Box flex="1" p="5" overflowY="auto" maxH="60vh">{group.messages.length ? <Flex direction="column" gap="5">{group.messages.map((message) => { const parent = group.messages.find((item) => item.id === message.replyToId); return <Flex key={message.id} gap="3"><Box flexShrink="0" w="36px" h="36px" borderRadius="full" bg={colors.signalSoft} display="grid" placeItems="center" fontWeight="800">{message.authorName.charAt(0).toUpperCase()}</Box><Box minW="0"><Flex gap="2" align="baseline" wrap="wrap"><Text fontWeight="800">{message.authorName}</Text><Text color={colors.muted} fontSize="xs">{formatDateTime(message.createdAt)}</Text></Flex>{parent && <Box mt="1" mb="2" pl="3" borderLeft="2px solid" borderColor={colors.line}><Text color={colors.muted} fontSize="sm" lineClamp="1">{parent.authorName}: {parent.body}</Text></Box>}<Text mt="1" whiteSpace="pre-wrap" overflowWrap="anywhere">{message.body}</Text><Button mt="1" size="xs" variant="ghost" color={colors.muted} onClick={() => setReplyTo(message)}><CornerUpLeft size={13} />Reply</Button></Box></Flex>; })}<div ref={endRef} /></Flex> : <Flex minH="360px" align="center" justify="center" direction="column" textAlign="center"><Heading as="h2" fontSize="xl">Start the conversation</Heading><Text color={colors.muted} mt="2">Messages from students and coordinators appear here.</Text></Flex>}</Box><Box p="4" borderTop="1px solid" borderColor={colors.line}>{replyTo && <Flex bg={colors.paperDeep} p="2" borderRadius="10px" justify="space-between" align="center" mb="2"><Text fontSize="sm" lineClamp="1">Replying to {replyTo.authorName}: {replyTo.body}</Text><Button size="xs" variant="ghost" aria-label="Cancel reply" onClick={() => setReplyTo(null)}><X size={14} /></Button></Flex>}<Flex gap="2" align="end"><Textarea aria-label="Message" value={body} onChange={(event) => setBody(event.target.value)} maxLength={4000} minH="76px" placeholder={`Message ${group.name}`} /><Button aria-label="Send message" bg={colors.signal} color={colors.ink} disabled={!body.trim()} loading={send.isPending} onClick={() => send.mutate()}><Send size={17} /></Button></Flex><Text color={colors.muted} fontSize="xs" textAlign="right" mt="1">{body.length}/4000</Text></Box></Flex><Box w={{ base: "full", lg: "290px" }}><Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="5"><Heading as="h2" fontSize="lg">About</Heading><Text color={colors.muted} mt="2">{group.description || "A PlaceFlow community group."}</Text><Text mt="4" fontWeight="700">{group.memberCount} members</Text></Box>{canModerate && pending.length > 0 && <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p="5" mt="4"><Heading as="h2" fontSize="lg">Join requests</Heading><Flex direction="column" gap="3" mt="4">{pending.map((member) => <Box key={member.userId}><Text fontWeight="700">{member.fullName}</Text><Flex gap="2" mt="2"><Button size="xs" bg={colors.successSoft} color={colors.success} loading={moderate.isPending} onClick={() => moderate.mutate({ userId: member.userId, action: "approve" })}><Check size={14} />Approve</Button><Button size="xs" variant="ghost" color={colors.danger} loading={moderate.isPending} onClick={() => moderate.mutate({ userId: member.userId, action: "reject" })}><X size={14} />Reject</Button></Flex></Box>)}</Flex></Box>}</Box></Flex></Box>;
}
