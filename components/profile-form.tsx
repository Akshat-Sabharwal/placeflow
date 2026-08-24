"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Box, Button, Flex, Grid, Input, Progress, Text } from "@chakra-ui/react";
import { Save } from "lucide-react";
import { BRANCH_SUGGESTIONS } from "@/lib/contracts/branches";
import { updateProfileSchema } from "@/lib/contracts/schemas";
import { FormField } from "@/components/form-field";
import { colors } from "@/lib/ui/tokens";

type ProfileInput = z.input<typeof updateProfileSchema>;
export type ProfileOutput = z.output<typeof updateProfileSchema>;

function valuesFromPrefill(prefill?: Partial<ProfileInput>): Partial<ProfileInput> {
  return {
    fullName: "",
    rollNumber: "",
    branch: "",
    linkedinUrl: "",
    githubUrl: "",
    ...prefill,
  };
}

export function ProfileForm({ prefill, onReviewSubmit, pending = false, submitLabel = "Confirm and lock profile" }: { prefill?: Partial<ProfileInput>; onReviewSubmit: (values: ProfileOutput) => void | Promise<void>; pending?: boolean; submitLabel?: string }) {
  const form = useForm<ProfileInput, unknown, ProfileOutput>({
    resolver: zodResolver(updateProfileSchema), mode: "onChange", reValidateMode: "onChange", delayError: 250,
    defaultValues: valuesFromPrefill(prefill),
  });
  useEffect(() => { form.reset(valuesFromPrefill(prefill)); }, [form, prefill]);
  const watched = useWatch({ control: form.control });
  const requiredValues = [watched.fullName, watched.rollNumber, watched.branch, watched.graduationYear, watched.cgpa, watched.backlogs];
  const completion = Math.round((requiredValues.filter((value) => value !== "" && value !== undefined && value !== null && !(typeof value === "number" && Number.isNaN(value))).length / requiredValues.length) * 100);
  const field = (name: keyof ProfileInput) => ({ error: form.formState.errors[name]?.message?.toString(), valid: Boolean(form.formState.touchedFields[name] && !form.formState.errors[name]) });

  return (
    <form noValidate onSubmit={form.handleSubmit((values) => void onReviewSubmit(values))}>
      <Box>
      <Box mb="8"><Flex justify="space-between" mb="2"><Text fontWeight="700">Profile completion</Text><Text color={colors.muted}>{completion}%</Text></Flex><Progress.Root value={completion} colorPalette="orange" size="sm"><Progress.Track><Progress.Range /></Progress.Track></Progress.Root></Box>

      <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
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

      <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }} mt="4">
        <Text fontWeight="800" fontSize="lg" mb="5">Professional links <Text as="span" color={colors.muted} fontWeight="400">(optional)</Text></Text>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="5">
          <FormField label="LinkedIn URL" {...field("linkedinUrl")}><Input type="url" {...form.register("linkedinUrl")} placeholder="https://www.linkedin.com/in/..." /></FormField>
          <FormField label="GitHub URL" {...field("githubUrl")}><Input type="url" {...form.register("githubUrl")} placeholder="https://github.com/..." /></FormField>
        </Grid>
      </Box>

      <Flex mt="6" justify="flex-end" align="center" gap="4"><Text color={colors.muted} fontSize="sm" aria-live="polite">{form.formState.isValid ? "All required values are ready for confirmation." : "Review the required fields."}</Text><Button type="submit" bg={colors.signal} color={colors.ink} loading={pending} loadingText="Locking…" disabled={!form.formState.isValid || pending}><Save size={17} />{submitLabel}</Button></Flex>
      </Box>
    </form>
  );
}
