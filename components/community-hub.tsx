"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Dialog, Field, Flex, Heading, Input, NativeSelect, Portal, Text, Textarea } from "@chakra-ui/react";
import { ArrowRight, LockKeyhole, MessageCircle, Plus, UsersRound, X } from "lucide-react";
import { toast } from "sonner";
import type { AppRole, CommunityVisibility } from "@/lib/contracts/domain";
import { createCommunity, getCommunities, joinCommunity } from "@/lib/api-client/community";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { ApiErrorAlert, EmptyState, PageSkeleton } from "@/components/async-state";

export function CommunityHub({ role, defaultVisibility }: { role: AppRole; defaultVisibility: CommunityVisibility }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.communities, queryFn: getCommunities });
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState(defaultVisibility);
  const create = useMutation({
    mutationFn: () => createCommunity({ name: name.trim(), description: description.trim(), visibility }),
    onSuccess: async () => { toast.success("Group created."); setCreating(false); setName(""); setDescription(""); await queryClient.invalidateQueries({ queryKey: queryKeys.communities }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The group could not be created."),
  });
  const join = useMutation({
    mutationFn: joinCommunity,
    onSuccess: async (group) => { toast.success(group.viewerStatus === "active" ? "You joined the group." : "Join request sent."); await queryClient.invalidateQueries({ queryKey: queryKeys.communities }); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The group could not be joined."),
  });
  if (query.isLoading) return <PageSkeleton rows={4} />;
  if (query.isError) return <ApiErrorAlert error={query.error} onRetry={() => query.refetch()} />;
  const valid = name.trim().length >= 2 && name.trim().length <= 80 && description.trim().length <= 1000;
  return <>
    <Flex justify="space-between" align={{ base: "start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap="4" mb="6"><Text color={colors.muted}>{query.data?.length ?? 0} discoverable groups</Text><Button bg={colors.signal} color={colors.onSignal} _hover={{ bg: colors.signalDark }} _active={{ bg: colors.signalDark }} onClick={() => setCreating(true)}><Plus size={17} />Create group</Button></Flex>
    {query.data?.length ? <Flex direction="column" gap="3">{query.data.map((group) => <Flex key={group.id} bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "6" }} justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap="5"><Box><Flex align="center" gap="2" color={colors.signalText} fontSize="xs" fontWeight="800" textTransform="uppercase" letterSpacing=".07em">{group.visibility === "private" ? <LockKeyhole size={14} /> : <UsersRound size={14} />}{group.visibility} group</Flex><Heading as="h2" fontSize="xl" mt="2">{group.name}</Heading><Text color={colors.muted} mt="2" maxW="670px">{group.description || "A PlaceFlow community group."}</Text><Flex gap="4" mt="4" color={colors.muted} fontSize="sm"><Text>{group.memberCount} members</Text><Text>Created by {group.ownerName}</Text>{group.pendingCount > 0 && <Text color={colors.warning}>{group.pendingCount} pending</Text>}</Flex></Box><Flex gap="2">{!group.viewerStatus && <Button variant="outline" loading={join.isPending && join.variables === group.id} onClick={() => join.mutate(group.id)}>{group.visibility === "public" ? "Join" : "Request to join"}</Button>}{group.viewerStatus === "pending" && <Button variant="outline" disabled>Request pending</Button>}{group.viewerStatus === "rejected" && <Button variant="outline" loading={join.isPending && join.variables === group.id} onClick={() => join.mutate(group.id)}>Request again</Button>}{group.viewerStatus === "active" && <Button asChild bg={colors.neutralSolid} color={colors.onNeutral} _hover={{ bg: colors.neutralSolidHover, color: colors.onNeutral }} _active={{ bg: colors.neutralSolidHover }}><Link href={`/${role}/community/${group.id}`}><MessageCircle size={16} />Open group<ArrowRight size={15} /></Link></Button>}</Flex></Flex>)}</Flex> : <EmptyState title="No groups have been created yet" description="Create a public discussion space or a private group with approval-controlled membership." />}
    <Dialog.Root open={creating} onOpenChange={(event) => setCreating(event.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content bg={colors.surface} borderRadius="18px" maxW="560px"><Dialog.Header><Dialog.Title>Create a group</Dialog.Title><Dialog.CloseTrigger asChild><Button variant="ghost" aria-label="Close create group dialog"><X size={18} /></Button></Dialog.CloseTrigger></Dialog.Header><Dialog.Body><Flex direction="column" gap="4"><Field.Root invalid={name.length > 0 && name.trim().length < 2}><Field.Label>Group name</Field.Label><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="Frontend interview prep" /><Flex justify="space-between" w="full"><Field.ErrorText>Use at least 2 characters.</Field.ErrorText><Field.HelperText>{name.length}/80</Field.HelperText></Flex></Field.Root><Field.Root invalid={description.length > 1000}><Field.Label>Description</Field.Label><Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} minH="120px" placeholder="What belongs in this group?" /><Field.HelperText alignSelf="end">{description.length}/1000</Field.HelperText></Field.Root><Field.Root><Field.Label>Visibility</Field.Label><NativeSelect.Root><NativeSelect.Field value={visibility} onChange={(event) => setVisibility(event.target.value as CommunityVisibility)}><option value="public">Public — anyone can join instantly</option><option value="private">Private — owners approve requests</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root></Flex></Dialog.Body><Dialog.Footer><Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button><Button bg={colors.signal} color={colors.onSignal} _hover={{ bg: colors.signalDark }} _active={{ bg: colors.signalDark }} disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>Create group</Button></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
  </>;
}
