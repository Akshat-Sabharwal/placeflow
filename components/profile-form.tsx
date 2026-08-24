"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Alert, Box, Button, Flex, Grid, Input, Progress, Text } from "@chakra-ui/react";
import { Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ProfileDTO } from "@/lib/contracts/domain";
import { BRANCH_SUGGESTIONS } from "@/lib/contracts/branches";
import { updateProfileSchema } from "@/lib/contracts/schemas";
import { updateProfile } from "@/lib/api-client/profile";
import { ApiError } from "@/lib/api-client/errors";
import { queryKeys } from "@/lib/queries/keys";
import { FormField } from "@/components/form-field";
import { colors } from "@/lib/ui/tokens";

type ProfileInput = z.input<typeof updateProfileSchema>;
type ProfileOutput = z.output<typeof updateProfileSchema>;

function valuesFromProfile(profile?: ProfileDTO | null): ProfileInput {
  return {
    fullName: profile?.fullName ?? "", rollNumber: profile?.rollNumber ?? "", branch: profile?.branch ?? "",
    graduationYear: profile?.graduationYear ?? new Date().getFullYear(), cgpa: profile?.cgpa ?? 0, backlogs: profile?.backlogs ?? 0,
    linkedinUrl: profile?.linkedinUrl ?? "", githubUrl: profile?.githubUrl ?? "",
  };
}

export function ProfileForm({ profile, onboarding = false }: { profile?: ProfileDTO | null; onboarding?: boolean }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<ProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(updateProfileSchema), mode: "onChange", reValidateMode: "onChange", delayError: 250,
    defaultValues: valuesFromProfile(profile),
  });
  useEffect(() => { if (profile) form.reset(valuesFromProfile(profile)); }, [form, profile]);
  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      toast.success(onboarding ? "Profile complete. Welcome to PlaceFlow." : "Profile saved.");
      if (onboarding) router.replace("/student");
    },
    onError: (error) => {
      if (error instanceof ApiError && typeof error.details.field === "string") form.setError(error.details.field as keyof ProfileInput, { message: error.message });
    },
  });
  const watched = useWatch({ control: form.control });
  const requiredValues = [watched.fullName, watched.rollNumber, watched.branch, watched.graduationYear, watched.cgpa, watched.backlogs];
  const completion = Math.round((requiredValues.filter((value) => value !== "" && value !== undefined && value !== null).length / requiredValues.length) * 100);
  const field = (name: keyof ProfileInput) => ({ error: form.formState.errors[name]?.message?.toString(), valid: Boolean(form.formState.touchedFields[name] && !form.formState.errors[name]) });

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <Box>
      {onboarding && <Box mb="8"><Flex justify="space-between" mb="2"><Text fontWeight="700">Profile completion</Text><Text color={colors.muted}>{completion}%</Text></Flex><Progress.Root value={completion} colorPalette="orange" size="sm"><Progress.Track><Progress.Range /></Progress.Track></Progress.Root></Box>}
      {mutation.isError && <Alert.Root status="error" mb="6" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>We could not save your profile.</Alert.Title><Alert.Description>{mutation.error.message}</Alert.Description></Alert.Content></Alert.Root>}

      <Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
        <Text fontWeight="800" fontSize="lg" mb="5">Identity and academics</Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="5">
          <FormField label="Full name" required {...field("fullName")}><Input {...form.register("fullName")} autoComplete="name" placeholder="Your full name" /></FormField>
          <FormField label="Roll number" required {...field("rollNumber")} helper="Use the roll number issued by your institution."><Input {...form.register("rollNumber")} autoCapitalize="characters" /></FormField>
          <FormField label="Branch" required {...field("branch")}><Input {...form.register("branch")} list="branch-suggestions" placeholder="e.g. CSE" /><datalist id="branch-suggestions">{BRANCH_SUGGESTIONS.map((branch) => <option value={branch} key={branch} />)}</datalist></FormField>
          <FormField label="Graduation year" required {...field("graduationYear")}><Input type="number" inputMode="numeric" {...form.register("graduationYear", { valueAsNumber: true })} /></FormField>
          <FormField label="CGPA" required {...field("cgpa")} helper="Enter a value from 0 to 10."><Input type="number" inputMode="decimal" step="0.01" min="0" max="10" {...form.register("cgpa", { valueAsNumber: true })} /></FormField>
          <FormField label="Current backlogs" required {...field("backlogs")}><Input type="number" inputMode="numeric" min="0" max="99" {...form.register("backlogs", { valueAsNumber: true })} /></FormField>
        </Grid>
      </Box>

      <Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }} mt="4">
        <Text fontWeight="800" fontSize="lg" mb="5">Professional links <Text as="span" color={colors.muted} fontWeight="400">(optional)</Text></Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="5">
          <FormField label="LinkedIn URL" {...field("linkedinUrl")}><Input type="url" {...form.register("linkedinUrl")} placeholder="https://www.linkedin.com/in/..." /></FormField>
          <FormField label="GitHub URL" {...field("githubUrl")}><Input type="url" {...form.register("githubUrl")} placeholder="https://github.com/..." /></FormField>
        </Grid>
      </Box>

      <Flex mt="6" justify="flex-end" align="center" gap="4"><Text color={colors.muted} fontSize="sm" aria-live="polite">{form.formState.isDirty ? "You have unsaved changes." : "All changes saved."}</Text><Button type="submit" bg={colors.signal} color={colors.ink} loading={mutation.isPending} loadingText="Saving…" disabled={!form.formState.isValid || !form.formState.isDirty}><Save size={17} />{onboarding ? "Complete profile" : "Save changes"}</Button></Flex>
      </Box>
    </form>
  );
}
