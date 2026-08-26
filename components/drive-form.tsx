"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Alert, Box, Button, Flex, Grid, Input, NativeSelect, Progress, Text, Textarea } from "@chakra-ui/react";
import { Eye, FileSearch, Save, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { DriveDTO, DriveRoundDTO } from "@/lib/contracts/domain";
import { createDriveSchema } from "@/lib/contracts/schemas";
import { createDrive, updateDrive } from "@/lib/api-client/drives";
import { queryKeys } from "@/lib/queries/keys";
import { documentMimeType, validateDocument } from "@/lib/ui/files";
import { extractDocumentText } from "@/lib/ui/document-text";
import { extractDriveFields } from "@/lib/ui/drive-extraction";
import { colors } from "@/lib/ui/tokens";
import { FormField } from "@/components/form-field";
import { ConfirmDialog } from "@/components/confirm-dialog";

type DriveInput = z.input<typeof createDriveSchema>;
type DriveOutput = z.output<typeof createDriveSchema>;

function defaults(drive?: DriveDTO): DriveInput {
  return {
    companyName: drive?.companyName ?? "",
    jobRole: drive?.jobRole ?? "",
    description: drive?.description ?? "",
    location: drive?.location ?? "",
    packageText: drive?.packageText ?? "",
    eligibleBranches: drive?.eligibleBranches ?? [],
    eligibleYears: drive?.eligibleYears ?? [],
    minimumCgpa: drive?.minimumCgpa ?? 0,
    maximumBacklogs: drive?.maximumBacklogs ?? 0,
    registrationDeadline: drive?.registrationDeadline ?? new Date(Date.now() + 86_400_000).toISOString(),
    driveDate: drive?.driveDate ?? null,
    rounds: drive?.rounds ?? [],
    activeRoundIndex: drive?.activeRoundIndex ?? null,
    status: drive?.status === "published" ? "published" : "draft",
  };
}

function toLocalDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function roundLines(rounds: Array<Partial<DriveRoundDTO>> | undefined) {
  return (rounds ?? []).map((round) => round.description ? `${round.name ?? "Round"} | ${round.description}` : round.name ?? "Round").join("\n");
}

function parseRoundLines(value: string): DriveRoundDTO[] {
  return value.split(/\n+/).map((line) => line.trim()).filter(Boolean).slice(0, 12).map((line) => {
    const [name, ...description] = line.split("|");
    return { name: name.trim(), description: description.join("|").trim() || null };
  });
}

export function DriveForm({ drive }: { drive?: DriveDTO }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [intent, setIntent] = useState<"draft" | "published" | "edit">("draft");
  const [extracting, setExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionMessage, setExtractionMessage] = useState<string | null>(null);
  const form = useForm<DriveInput, unknown, DriveOutput>({
    resolver: zodResolver(createDriveSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    delayError: 250,
    defaultValues: defaults(drive),
  });

  useEffect(() => { if (drive) form.reset(defaults(drive)); }, [drive, form]);
  useEffect(() => {
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      if (!form.formState.isDirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [form.formState.isDirty]);

  const watched = useWatch({ control: form.control });
  const mutation = useMutation({
    mutationFn: async (values: DriveOutput) =>
      drive ? updateDrive(drive.id, { ...values, status: drive.status }) : createDrive(values),
    onSuccess: async (saved) => {
      toast.success(drive ? "Drive changes saved." : saved.status === "published" ? "Drive published." : "Draft saved.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["drives"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.drive(saved.id) }),
      ]);
      setPublishConfirm(false);
      router.push(`/coordinator/drives/${saved.id}`);
    },
  });

  const field = (name: keyof DriveInput) => ({
    error: form.formState.errors[name]?.message?.toString(),
    valid: Boolean(form.formState.touchedFields[name] && !form.formState.errors[name]),
  });

  async function extractFromFile(file?: File) {
    if (!file) return;
    const mimeType = documentMimeType(file);
    const validationError = validateDocument(file);
    if (validationError || (!mimeType.startsWith("image/") && mimeType !== "application/pdf")) {
      setExtractionMessage(validationError ?? "Choose a PDF, PNG, JPEG, or WebP drive document.");
      return;
    }
    setExtracting(true);
    setExtractionProgress(2);
    setExtractionMessage(null);
    try {
      const { text, engine } = await extractDocumentText(file, setExtractionProgress);
      const extracted = extractDriveFields(text);
      const assign = <K extends keyof DriveInput>(name: K, value: DriveInput[K] | undefined) => {
        if (value !== undefined) form.setValue(name, value as never, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
      };
      assign("companyName", extracted.companyName);
      assign("jobRole", extracted.jobRole);
      assign("description", extracted.description);
      assign("location", extracted.location);
      assign("packageText", extracted.packageText);
      assign("eligibleBranches", extracted.eligibleBranches);
      assign("eligibleYears", extracted.eligibleYears);
      assign("minimumCgpa", extracted.minimumCgpa);
      assign("maximumBacklogs", extracted.maximumBacklogs);
      assign("registrationDeadline", extracted.registrationDeadline);
      assign("driveDate", extracted.driveDate);
      assign("rounds", extracted.rounds);
      if (extracted.rounds?.length && watched.activeRoundIndex === null) assign("activeRoundIndex", 0);
      const count = Object.values(extracted).filter((value) => value !== undefined).length;
      setExtractionProgress(100);
      setExtractionMessage(count
        ? `${count} field groups were suggested with ${engine}. Review every value before saving.`
        : "Text was read, but no reliable drive fields were found. Complete the form manually.");
    } catch (error) {
      setExtractionMessage(error instanceof Error ? error.message : "The drive document could not be read.");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const submitWith = (nextIntent: typeof intent) => {
    setIntent(nextIntent);
    form.setValue("status", nextIntent === "published" ? "published" : drive?.status === "published" ? "published" : "draft", { shouldValidate: true });
    if (nextIntent === "published" && !drive) { setPublishConfirm(true); return; }
    void form.handleSubmit((values) => mutation.mutate(values))();
  };
  const publish = () => void form.handleSubmit((values) => mutation.mutate({ ...values, status: "published" }))();

  return <form noValidate onSubmit={(event) => event.preventDefault()}><Box>
    {mutation.isError && <Alert.Root status="error" mb="5" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>Drive not saved</Alert.Title><Alert.Description>{mutation.error.message}</Alert.Description></Alert.Content></Alert.Root>}

    <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }} mb="4">
      <Flex justify="space-between" align={{ base: "start", md: "center" }} direction={{ base: "column", md: "row" }} gap="4">
        <Box><Flex gap="2" align="center" color={colors.signalText} fontWeight="800"><FileSearch size={19} />Create from a drive document</Flex><Text color={colors.muted} mt="2" maxW="650px">Upload a PDF or image. Text extraction happens in this browser and fills company, role, eligibility, dates, and detected rounds for review.</Text></Box>
        <Button variant="outline" loading={extracting} onClick={() => fileInputRef.current?.click()}><Upload size={17} />Read document</Button>
      </Flex>
      {extracting && <Progress.Root value={extractionProgress} mt="4" colorPalette="orange"><Progress.Track><Progress.Range /></Progress.Track></Progress.Root>}
      {extractionMessage && <Alert.Root status={extractionProgress === 100 ? "info" : "warning"} mt="4" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Description>{extractionMessage}</Alert.Description></Alert.Content></Alert.Root>}
      <input ref={fileInputRef} hidden type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => void extractFromFile(event.target.files?.[0])} />
    </Box>

    <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
      <Text fontSize="lg" fontWeight="800" mb="5">Role details</Text>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="5">
        <FormField label="Company" required {...field("companyName")}><Input {...form.register("companyName")} /></FormField>
        <FormField label="Job role" required {...field("jobRole")}><Input {...form.register("jobRole")} /></FormField>
        <FormField label="Location" {...field("location")}><Input {...form.register("location")} placeholder="Campus / city / remote" /></FormField>
        <FormField label="Package" {...field("packageText")}><Input {...form.register("packageText")} placeholder="e.g. ₹12 LPA" /></FormField>
      </Grid>
      <Box mt="5"><FormField label="Description" {...field("description")} helper="Explain the role, process, and preparation students need."><Textarea rows={7} {...form.register("description")} /></FormField></Box>
    </Box>

    <Box mt="4" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
      <Text fontSize="lg" fontWeight="800" mb="5">Eligibility</Text>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="5">
        <FormField label="Eligible branches" required {...field("eligibleBranches")} helper="Separate branches with commas."><Input value={(watched.eligibleBranches ?? []).join(", ")} onChange={(event) => form.setValue("eligibleBranches", event.target.value.split(",").map((value) => value.trim().toUpperCase()).filter(Boolean), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} placeholder="CSE, IT, ECE" /></FormField>
        <FormField label="Eligible graduation years" required {...field("eligibleYears")} helper="Separate years with commas."><Input value={(watched.eligibleYears ?? []).join(", ")} onChange={(event) => form.setValue("eligibleYears", event.target.value.split(",").map((value) => value.trim()).filter(Boolean).map(Number).filter(Number.isFinite), { shouldDirty: true, shouldTouch: true, shouldValidate: true })} placeholder="2027, 2028" /></FormField>
        <FormField label="Minimum CGPA" required {...field("minimumCgpa")}><Input type="number" min="0" max="10" step="0.01" {...form.register("minimumCgpa", { valueAsNumber: true })} /></FormField>
        <FormField label="Maximum backlogs" required {...field("maximumBacklogs")}><Input type="number" min="0" max="99" {...form.register("maximumBacklogs", { valueAsNumber: true })} /></FormField>
      </Grid>
    </Box>

    <Box mt="4" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
      <Text fontSize="lg" fontWeight="800" mb="5">Schedule and rounds</Text>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="5">
        <FormField label="Registration deadline" required {...field("registrationDeadline")}><Input type="datetime-local" value={toLocalDateTime(watched.registrationDeadline)} onChange={(event) => form.setValue("registrationDeadline", event.target.value ? new Date(event.target.value).toISOString() : "", { shouldDirty: true, shouldTouch: true, shouldValidate: true })} /></FormField>
        <FormField label="Drive date" {...field("driveDate")} helper="Must be after the registration deadline."><Input type="datetime-local" value={toLocalDateTime(watched.driveDate)} onChange={(event) => form.setValue("driveDate", event.target.value ? new Date(event.target.value).toISOString() : null, { shouldDirty: true, shouldTouch: true, shouldValidate: true })} /></FormField>
      </Grid>
      <Box mt="5"><FormField label="Selection rounds" {...field("rounds")} helper="One round per line. Add an optional description after |. OCR-detected rounds appear here."><Textarea rows={5} value={roundLines(watched.rounds)} onChange={(event) => { const rounds = parseRoundLines(event.target.value); form.setValue("rounds", rounds, { shouldDirty: true, shouldTouch: true, shouldValidate: true }); if (watched.activeRoundIndex !== null && watched.activeRoundIndex !== undefined && watched.activeRoundIndex >= rounds.length) form.setValue("activeRoundIndex", rounds.length ? rounds.length - 1 : null, { shouldDirty: true }); }} placeholder={"Aptitude test | Online assessment\nTechnical interview\nHR interview"} /></FormField></Box>
      {(watched.rounds?.length ?? 0) > 0 && <Box mt="5"><Text fontWeight="700" mb="2">Active round</Text><NativeSelect.Root maxW="360px"><NativeSelect.Field value={watched.activeRoundIndex ?? ""} onChange={(event) => form.setValue("activeRoundIndex", event.target.value === "" ? null : Number(event.target.value), { shouldDirty: true, shouldValidate: true })} aria-label="Active drive round"><option value="">Not started</option>{(watched.rounds ?? []).map((round, index) => <option key={`${round.name ?? "round"}-${index}`} value={index}>{index + 1}. {round.name ?? "Round"}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>}
    </Box>

    <Flex position="sticky" bottom={{ base: "72px", md: "0" }} zIndex="10" mt="5" bg={colors.header} backdropFilter="blur(12px)" border="1px solid" borderColor={colors.line} borderRadius="16px" p="3" align="center" justify="space-between" gap="3" wrap="wrap"><Text color={colors.muted} fontSize="sm">{form.formState.isDirty ? "Unsaved changes" : "All changes saved"}</Text><Flex gap="2">{!drive && <Button variant="outline" onClick={() => submitWith("draft")} loading={mutation.isPending && intent === "draft"}><Save size={16} />Save draft</Button>}<Button bg={colors.signal} color={colors.onSignal} _hover={{ bg: colors.signalDark }} _active={{ bg: colors.signalDark }} onClick={() => submitWith(drive ? "edit" : "published")} loading={mutation.isPending && intent !== "draft"} disabled={!form.formState.isValid || (drive ? !form.formState.isDirty : false)}>{drive ? <Save size={16} /> : <Eye size={16} />}{drive ? "Save changes" : "Publish"}</Button></Flex></Flex>
    <ConfirmDialog open={publishConfirm} onOpenChange={setPublishConfirm} title="Publish this drive?" description={`Students who meet the eligibility rules will see ${watched.companyName || "this drive"} immediately. The registration deadline is ${toLocalDateTime(watched.registrationDeadline).replace("T", " at ")}.`} confirmLabel="Publish drive" onConfirm={publish} pending={mutation.isPending} />
  </Box></form>;
}
