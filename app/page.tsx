import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  Link as ChakraLink,
  Text,
} from "@chakra-ui/react";

import { Brand } from "@/components/brand";
import { colors } from "@/lib/ui/tokens";

const workflow = [
  {
    number: "01",
    title: "Publish",
    copy: "Coordinators create clear, eligibility-aware drives.",
  },
  {
    number: "02",
    title: "Apply",
    copy: "Students use a verified profile and a private resume.",
  },
  {
    number: "03",
    title: "Decide",
    copy: "Every application moves through one visible workflow.",
  },
];

const principles = [
  {
    icon: FileCheck2,
    title: "Explainable eligibility",
    copy: "Students see the exact rules they meet before they apply.",
  },
  {
    icon: LockKeyhole,
    title: "Private by default",
    copy: "Resumes stay private and are shared through short-lived access.",
  },
  {
    icon: UsersRound,
    title: "Two focused workspaces",
    copy: "Students and coordinators see only the tools their work requires.",
  },
  {
    icon: Sparkles,
    title: "Quietly current",
    copy: "Polling and optional notifications surface persisted changes without noise.",
  },
];

export default function Home() {
  return (
    <Box minH="100vh" bg={colors.paper} color={colors.ink}>
      <ChakraLink
        href="#main-content"
        position="fixed"
        top="3"
        left="3"
        zIndex="100"
        bg={colors.ink}
        color={colors.paper}
        px="4"
        py="2"
        borderRadius="md"
        transform="translateY(-160%)"
        _focus={{ transform: "translateY(0)" }}
      >
        Skip to content
      </ChakraLink>

      <Box as="header" borderBottom="1px solid" borderColor={colors.line}>
        <Flex
          maxW="1200px"
          mx="auto"
          px={{ base: "5", md: "8" }}
          h="76px"
          align="center"
          justify="space-between"
        >
          <Brand />
          <Flex as="nav" aria-label="Primary navigation" gap="2" align="center">
            <Button
              asChild
              variant="ghost"
              display={{ base: "none", sm: "inline-flex" }}
            >
              <a href="#how-it-works">How it works</a>
            </Button>
            <Button
              asChild
              bg={colors.ink}
              color={colors.paper}
              borderRadius="full"
              px="5"
              _hover={{ bg: colors.lineStrong }}
            >
              <Link href="/login">
                Sign in <ArrowRight size={16} />
              </Link>
            </Button>
          </Flex>
        </Flex>
      </Box>

      <Box as="main" id="main-content">
        <Grid
          maxW="1200px"
          mx="auto"
          px={{ base: "5", md: "8" }}
          py={{ base: "16", md: "24" }}
          templateColumns={{ base: "1fr", lg: "1.1fr .9fr" }}
          gap={{ base: "14", lg: "20" }}
          alignItems="center"
        >
          <Box>
            <Flex
              align="center"
              gap="2"
              mb="7"
              fontSize="sm"
              fontWeight="700"
              letterSpacing=".08em"
              textTransform="uppercase"
            >
              <Box w="8" h="2px" bg={colors.signal} /> Campus placement
              operations
            </Flex>
            <Heading
              as="h1"
              fontSize={{ base: "4xl", sm: "5xl", md: "7xl" }}
              lineHeight=".96"
              letterSpacing="-.055em"
              maxW="760px"
            >
              Placement work,
              <br />
              in one clear flow.
            </Heading>
            <Text
              mt="7"
              maxW="620px"
              fontSize={{ base: "lg", md: "xl" }}
              lineHeight="1.65"
              color={colors.muted}
            >
              PlaceFlow gives students and placement teams one dependable place
              to publish drives, check eligibility, apply, and track decisions.
            </Text>
            <Flex mt="9" gap="3" wrap="wrap">
              <Button
                asChild
                size="lg"
                bg={colors.signal}
                color={colors.ink}
                borderRadius="full"
                px="7"
                _hover={{ bg: colors.signalDark }}
              >
                <Link href="/login">
                  Enter PlaceFlow <ArrowRight size={18} />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                borderColor={colors.ink}
                borderRadius="full"
                px="7"
              >
                <a href="#how-it-works">See the workflow</a>
              </Button>
            </Flex>
          </Box>

          <Box
            aria-label="PlaceFlow workflow: publish, apply, decide"
            border="1px solid"
            borderColor={colors.ink}
            bg={colors.surface}
            p={{ base: "5", md: "7" }}
            borderRadius="24px"
            boxShadow={`10px 10px 0 ${colors.signal}`}
            overflow="hidden"
          >
            <Image
              src="/placeflow-workflow.png"
              alt="Abstract PlaceFlow workflow linking a placement drive, student application, and outcome"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 1024px) 100vw, 42vw"
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "14px",
                marginBottom: "20px",
              }}
            />
            <Flex
              justify="space-between"
              align="center"
              pb="5"
              borderBottom="1px solid"
              borderColor={colors.line}
            >
              <Text fontWeight="700">One source of truth</Text>
              <Box
                w="12"
                h="12"
                borderRadius="full"
                bg={colors.signalSoft}
                display="grid"
                placeItems="center"
              >
                <CheckCircle2 size={22} />
              </Box>
            </Flex>
            <Box pt="2">
              {workflow.map((item, index) => (
                <Grid
                  key={item.number}
                  templateColumns="42px 1fr"
                  gap="4"
                  py="5"
                  borderBottom={
                    index === workflow.length - 1 ? "none" : "1px solid"
                  }
                  borderColor={colors.line}
                >
                  <Text
                    fontSize="sm"
                    color={colors.signalDark}
                    fontWeight="800"
                  >
                    {item.number}
                  </Text>
                  <Box>
                    <Heading as="h2" fontSize="xl">
                      {item.title}
                    </Heading>
                    <Text color={colors.muted} mt="1">
                      {item.copy}
                    </Text>
                  </Box>
                </Grid>
              ))}
            </Box>
          </Box>
        </Grid>

        <Box
          id="how-it-works"
          as="section"
          aria-labelledby="workflow-title"
          bg={colors.ink}
          color={colors.paper}
          py={{ base: "16", md: "24" }}
        >
          <Box maxW="1200px" mx="auto" px={{ base: "5", md: "8" }}>
            <Text
              color={colors.signalSoft}
              fontWeight="700"
              textTransform="uppercase"
              letterSpacing=".08em"
            >
              Built around the actual work
            </Text>
            <Heading
              id="workflow-title"
              as="h2"
              mt="3"
              fontSize={{ base: "3xl", md: "5xl" }}
              lineHeight="1.02"
              letterSpacing="-.04em"
              maxW="720px"
            >
              Nothing between the drive and the decision.
            </Heading>
            <Grid
              mt="12"
              templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
              gap="4"
            >
              {workflow.map((item) => (
                <Box
                  key={item.number}
                  border="1px solid"
                  borderColor={colors.lineStrong}
                  p="6"
                  borderRadius="18px"
                  minH="210px"
                >
                  <Text color={colors.signalSoft} fontWeight="800">
                    {item.number}
                  </Text>
                  <Heading as="h3" mt="10" fontSize="2xl">
                    {item.title}
                  </Heading>
                  <Text mt="2" color={colors.muted} lineHeight="1.6">
                    {item.copy}
                  </Text>
                </Box>
              ))}
            </Grid>
          </Box>
        </Box>

        <Box
          as="section"
          aria-labelledby="principles-title"
          py={{ base: "16", md: "24" }}
        >
          <Box maxW="1200px" mx="auto" px={{ base: "5", md: "8" }}>
            <Heading
              id="principles-title"
              as="h2"
              fontSize={{ base: "3xl", md: "5xl" }}
              letterSpacing="-.04em"
            >
              Designed to earn trust.
            </Heading>
            <Grid
              mt="10"
              templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
              gap="4"
            >
              {principles.map(({ icon: Icon, title, copy }) => (
                <Box
                  key={title}
                  bg={colors.surface}
                  border="1px solid"
                  borderColor={colors.line}
                  borderRadius="18px"
                  p="6"
                >
                  <Box color={colors.signal}>
                    <Icon size={25} />
                  </Box>
                  <Heading as="h3" mt="6" fontSize="xl">
                    {title}
                  </Heading>
                  <Text mt="2" color={colors.muted} lineHeight="1.6">
                    {copy}
                  </Text>
                </Box>
              ))}
            </Grid>
          </Box>
        </Box>

        <Box as="section" px="5" pb={{ base: "16", md: "24" }}>
          <Flex
            maxW="1136px"
            mx="auto"
            bg={colors.signal}
            color={colors.ink}
            borderRadius="24px"
            px={{ base: "6", md: "10" }}
            py={{ base: "10", md: "12" }}
            align={{ base: "start", md: "center" }}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            gap="6"
          >
            <Box>
              <Heading
                as="h2"
                fontSize={{ base: "3xl", md: "4xl" }}
                lineHeight="1.02"
                letterSpacing="-.04em"
              >
                Ready when the next drive opens.
              </Heading>
              <Text mt="2" color={colors.ink}>
                Sign in with your existing Google or GitHub account.
              </Text>
            </Box>
            <Button
              asChild
              size="lg"
              bg={colors.surface}
              color={colors.ink}
              borderRadius="full"
              px="7"
            >
              <Link href="/login">
                Get started <ArrowRight size={18} />
              </Link>
            </Button>
          </Flex>
        </Box>
      </Box>

      <Flex
        as="footer"
        borderTop="1px solid"
        borderColor={colors.line}
        maxW="1200px"
        mx="auto"
        px={{ base: "5", md: "8" }}
        py="8"
        justify="space-between"
        direction={{ base: "column", sm: "row" }}
        gap="3"
      >
        <Brand compact />
        <Text color={colors.muted} fontSize="sm">
          Private resumes. Explainable decisions. No noise.
        </Text>
      </Flex>
    </Box>
  );
}
