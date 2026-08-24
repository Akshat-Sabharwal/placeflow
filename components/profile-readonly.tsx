"use client";

import { Box, Button, Flex, Grid, Heading, Text } from "@chakra-ui/react";
import { Check, Copy, ExternalLink, GraduationCap, IdCard, Link2, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ProfileDTO } from "@/lib/contracts/domain";
import { colors } from "@/lib/ui/tokens";

type CopyRow = { label: string; value: string; href?: string };

export function ProfileReadonly({ profile }: { profile: ProfileDTO }) {
  const academics: CopyRow[] = [
    { label: "Roll number", value: profile.rollNumber ?? "Not provided" },
    { label: "Branch", value: profile.branch ?? "Not provided" },
    { label: "Graduation year", value: profile.graduationYear?.toString() ?? "Not provided" },
    { label: "CGPA", value: profile.cgpa?.toString() ?? "Not provided" },
    { label: "Current backlogs", value: profile.backlogs?.toString() ?? "Not provided" },
  ];
  const links: CopyRow[] = [
    ...(profile.linkedinUrl ? [{ label: "LinkedIn", value: profile.linkedinUrl, href: profile.linkedinUrl }] : []),
    ...(profile.githubUrl ? [{ label: "GitHub", value: profile.githubUrl, href: profile.githubUrl }] : []),
  ];
  return <Flex direction="column" gap="4">
    <ProfileSection icon={UserRound} title="Identity"><Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="3"><CopyValue label="Full name" value={profile.fullName ?? "Not provided"} /><CopyValue label="Email" value={profile.email} /></Grid></ProfileSection>
    <ProfileSection icon={GraduationCap} title="Academic record"><Grid templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap="3">{academics.map((row) => <CopyValue key={row.label} {...row} />)}</Grid></ProfileSection>
    <ProfileSection icon={Link2} title="Professional links">{links.length ? <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="3">{links.map((row) => <CopyValue key={row.label} {...row} />)}</Grid> : <Text color={colors.muted}>No professional links were provided.</Text>}</ProfileSection>
    <Flex bg={colors.infoSoft} color={colors.info} border="1px solid" borderColor={colors.line} borderRadius="14px" p="4" gap="3"><IdCard size={20} /><Text fontSize="sm">This profile is read-only after onboarding so eligibility data remains dependable. Contact your placement coordinator if a verified academic value needs correction.</Text></Flex>
  </Flex>;
}

function ProfileSection({ icon: Icon, title, children }: { icon: typeof UserRound; title: string; children: React.ReactNode }) {
  return <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "6" }}><Flex gap="3" align="center" mb="5"><Box color={colors.signal}><Icon size={21} /></Box><Heading as="h2" fontSize="lg">{title}</Heading></Flex>{children}</Box>;
}

function CopyValue({ label, value, href }: CopyRow) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1400); }
    catch { toast.error("This browser could not copy the value."); }
  }
  const isMissing = value === "Not provided";
  return <Flex bg={colors.paperDeep} border="1px solid" borderColor={colors.line} borderRadius="12px" p="3" justify="space-between" align="center" gap="3"><Box minW="0"><Text color={colors.muted} fontSize="xs" textTransform="uppercase" letterSpacing=".05em">{label}</Text>{href ? <a href={href} target="_blank" rel="noreferrer"><Flex data-copyable mt="1" align="center" gap="1" fontWeight="700" overflowWrap="anywhere">{value}<ExternalLink size={14} /></Flex></a> : <Text data-copyable mt="1" fontWeight="700" overflowWrap="anywhere">{value}</Text>}</Box><Button size="xs" variant="ghost" aria-label={`Copy ${label}`} onClick={copy} disabled={isMissing}>{copied ? <Check size={15} /> : <Copy size={15} />}</Button></Flex>;
}
