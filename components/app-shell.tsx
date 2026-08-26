"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { BriefcaseBusiness, FileText, Home, LayoutList, LogOut, Network, Plus, Settings, UserRound, UsersRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeSync } from "@/components/theme-sync";
import { colors } from "@/lib/ui/tokens";

const studentNav = [
  { href: "/student", label: "Home", icon: Home },
  { href: "/student/drives", label: "Drives", icon: BriefcaseBusiness },
  { href: "/student/applications", label: "Applications", icon: LayoutList },
  { href: "/student/documents", label: "Documents", icon: FileText },
  { href: "/student/profile", label: "Profile", icon: UserRound },
  { href: "/student/community", label: "Community", icon: UsersRound },
  { href: "/student/people", label: "People", icon: Network },
  { href: "/student/settings", label: "Settings", icon: Settings },
];
const coordinatorNav = [
  { href: "/coordinator", label: "Overview", icon: Home },
  { href: "/coordinator/drives", label: "Drives", icon: BriefcaseBusiness },
  { href: "/coordinator/drives/new", label: "Create drive", icon: Plus },
  { href: "/coordinator/community", label: "Community", icon: UsersRound },
  { href: "/coordinator/people", label: "People", icon: Network },
  { href: "/coordinator/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/student" || href === "/coordinator") return pathname === href;
  return pathname.startsWith(href);
}

export function AppShell({ role, children }: { role: "student" | "coordinator"; children: ReactNode }) {
  const pathname = usePathname();
  const nav = role === "student" ? studentNav : coordinatorNav;
  return <Box minH="100vh" bg={colors.paper} color={colors.ink}><ThemeSync />
    <Flex as="header" position="sticky" top="0" zIndex="20" h="72px" bg={colors.header} backdropFilter="blur(12px)" borderBottom="1px solid" borderColor={colors.line} align="center" justify="space-between" px={{ base: "5", md: "7" }}><Brand /><Flex align="center" gap="2"><NotificationBell /><form action="/auth/signout" method="post"><Button type="submit" variant="plain" size="sm" aria-label="Sign out" bg={colors.headerControl} color={colors.onHeaderControl} border="1px solid" borderColor={colors.line} _hover={{ bg: colors.headerControlHover, color: colors.onHeaderControl, borderColor: colors.lineStrong }} _focusVisible={{ outlineColor: colors.focus }}><LogOut size={18} /><Text display={{ base: "none", md: "inline" }}>Sign out</Text></Button></form></Flex></Flex>
    <Flex>
      <Box as="nav" aria-label={`${role} navigation`} display={{ base: "none", md: "block" }} position="fixed" top="72px" bottom="0" w="230px" borderRight="1px solid" borderColor={colors.line} p="5" bg={colors.paper}>
        <Text fontSize="xs" color={colors.muted} fontWeight="800" textTransform="uppercase" letterSpacing=".08em" px="3" mb="3">{role} workspace</Text>
        <Flex direction="column" gap="1">{nav.map(({ href, label, icon: Icon }) => { const active = isActive(pathname, href); return <Button key={href} asChild justifyContent="start" variant="ghost" bg={active ? colors.surface : "transparent"} color={active ? colors.ink : colors.muted} border="1px solid" borderColor={active ? colors.lineStrong : "transparent"} boxShadow={active ? "var(--shadow-sm)" : "none"} borderRadius="12px" _hover={{ bg: colors.paperDeep, color: colors.ink, borderColor: colors.line, transform: "translateX(3px)" }} _focusVisible={{ bg: colors.paperDeep, color: colors.ink, borderColor: colors.focus }}><Link href={href} aria-current={active ? "page" : undefined}><Icon size={18} />{label}</Link></Button>; })}</Flex>
      </Box>
      <Box as="main" id="main-content" ml={{ base: "0", md: "230px" }} w={{ base: "full", md: "calc(100% - 230px)" }} px={{ base: "5", sm: "6", lg: "10" }} py={{ base: "7", md: "10" }} pb={{ base: "96px", md: "10" }}><Box maxW="1120px" mx="auto">{children}</Box></Box>
    </Flex>
    <Flex as="nav" aria-label={`${role} mobile navigation`} display={{ base: "flex", md: "none" }} position="fixed" bottom="0" left="0" right="0" zIndex="30" bg={colors.surface} borderTop="1px solid" borderColor={colors.line} h="72px" overflowX="auto" px="2">{nav.map(({ href, label, icon: Icon }) => { const active = isActive(pathname, href); return <Link key={href} href={href} aria-current={active ? "page" : undefined} style={{ minWidth: 72 }}><Flex h="full" align="center" justify="center" direction="column" gap="1" color={active ? colors.signalText : colors.muted} fontSize="10px" fontWeight="700"><Icon size={19} />{label}</Flex></Link>; })}</Flex>
  </Box>;
}
