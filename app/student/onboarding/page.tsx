"use client";

import { Box, Heading, Text } from "@chakra-ui/react";
import { colors } from "@/lib/ui/tokens";
import { ProfileForm } from "@/components/profile-form";

export default function OnboardingPage() {
  return <Box maxW="860px" mx="auto"><Text color={colors.signalDark} fontWeight="800" textTransform="uppercase" letterSpacing=".08em" fontSize="xs">One last step</Text><Heading as="h1" mt="2" fontSize={{ base: "3xl", md: "5xl" }} letterSpacing="-.05em">Build your placement profile.</Heading><Text color={colors.muted} mt="3" mb="9" maxW="650px">These details power clear eligibility checks. You can update them later from your profile.</Text><ProfileForm onboarding /></Box>;
}
