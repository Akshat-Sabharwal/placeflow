"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Button, Flex, Heading, NativeSelect, Spinner, Switch, Text } from "@chakra-ui/react";
import { Eye, LockKeyhole, Moon, Save, Sun, UsersRound } from "lucide-react";
import { toast } from "sonner";
import type { SettingsDTO } from "@/lib/contracts/domain";
import { getSettings, updateSettings } from "@/lib/api-client/settings";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { applyTheme } from "@/components/theme-sync";
import { ApiErrorAlert } from "@/components/async-state";

export function SettingsPanel() {
  const query = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings });
  if (query.isLoading) return <Flex minH="280px" align="center" justify="center"><Spinner /></Flex>;
  if (query.isError || !query.data) return <ApiErrorAlert error={query.error ?? new Error("Settings could not be loaded")} onRetry={() => query.refetch()} />;
  return <SettingsForm initial={query.data} />;
}

function SettingsForm({ initial }: { initial: SettingsDTO }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings) => { queryClient.setQueryData(queryKeys.settings, settings); setDraft(settings); applyTheme(settings.themePreference); toast.success("Settings saved."); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Settings could not be saved."),
  });
  const saved = queryClient.getQueryData<SettingsDTO>(queryKeys.settings) ?? initial;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  return <Flex direction="column" gap="4">
    <SettingCard icon={draft.themePreference === "dark" ? Moon : Sun} title="Application theme" description="Choose the palette used across your authenticated workspace.">
      <Flex gap="2"><Button variant={draft.themePreference === "light" ? "solid" : "outline"} bg={draft.themePreference === "light" ? colors.signal : undefined} color={draft.themePreference === "light" ? colors.onSignal : colors.ink} _hover={{ bg: draft.themePreference === "light" ? colors.signalDark : colors.paperDeep, color: draft.themePreference === "light" ? colors.onSignal : colors.ink }} _active={{ bg: draft.themePreference === "light" ? colors.signalDark : colors.paperDeep }} onClick={() => { setDraft({ ...draft, themePreference: "light" }); applyTheme("light"); }}><Sun size={17} />Light</Button><Button variant={draft.themePreference === "dark" ? "solid" : "outline"} bg={draft.themePreference === "dark" ? colors.signal : undefined} color={draft.themePreference === "dark" ? colors.onSignal : colors.ink} _hover={{ bg: draft.themePreference === "dark" ? colors.signalDark : colors.paperDeep, color: draft.themePreference === "dark" ? colors.onSignal : colors.ink }} _active={{ bg: draft.themePreference === "dark" ? colors.signalDark : colors.paperDeep }} onClick={() => { setDraft({ ...draft, themePreference: "dark" }); applyTheme("dark"); }}><Moon size={17} />Dark</Button></Flex>
    </SettingCard>
    <SettingCard icon={Eye} title="Public profile" description="Public profiles can appear in the people graph. Private profiles remain visible only in authorized placement workflows.">
      <NativeSelect.Root w="180px"><NativeSelect.Field aria-label="Profile visibility" value={draft.profileVisibility} onChange={(event) => setDraft({ ...draft, profileVisibility: event.target.value as SettingsDTO["profileVisibility"] })}><option value="public">Public</option><option value="private">Private</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
    </SettingCard>
    <SettingCard icon={UsersRound} title="Group visibility" description="Set the default privacy for groups you create and decide whether public memberships shape your profile graph.">
      <Flex direction="column" gap="4" align="end"><NativeSelect.Root w="220px"><NativeSelect.Field aria-label="Default group visibility" value={draft.defaultGroupVisibility} onChange={(event) => setDraft({ ...draft, defaultGroupVisibility: event.target.value as SettingsDTO["defaultGroupVisibility"] })}><option value="public">Public by default</option><option value="private">Private by default</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Switch.Root checked={draft.showGroupMemberships} onCheckedChange={(event) => setDraft({ ...draft, showGroupMemberships: event.checked })}><Switch.HiddenInput /><Switch.Control /><Switch.Label>Show public memberships</Switch.Label></Switch.Root></Flex>
    </SettingCard>
    <Flex position="sticky" bottom={{ base: "82px", md: "16px" }} bg={colors.header} backdropFilter="blur(12px)" border="1px solid" borderColor={colors.line} borderRadius="16px" p="3" align="center" justify="space-between"><Text color={colors.muted} fontSize="sm">{dirty ? "Unsaved changes" : "Everything is up to date"}</Text><Button bg={colors.signal} color={colors.onSignal} _hover={{ bg: colors.signalDark }} _active={{ bg: colors.signalDark }} disabled={!dirty} loading={mutation.isPending} onClick={() => mutation.mutate(draft)}><Save size={17} />Save settings</Button></Flex>
  </Flex>;
}

function SettingCard({ icon: Icon, title, description, children }: { icon: typeof LockKeyhole; title: string; description: string; children: React.ReactNode }) {
  return <Flex bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "6" }} justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap="5"><Flex gap="4"><Box color={colors.signal} mt="1"><Icon size={22} /></Box><Box><Heading as="h2" fontSize="lg">{title}</Heading><Text color={colors.muted} mt="1" maxW="590px">{description}</Text></Box></Flex>{children}</Flex>;
}
