"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Flex, Heading, Progress, Spinner, Text } from "@chakra-ui/react";
import { ArrowLeft, ArrowRight, FileSearch, ScanText, ShieldCheck, Upload } from "lucide-react";
import { toast } from "sonner";
import type { DocumentDTO, OnboardingProfileFieldsDTO } from "@/lib/contracts/domain";
import { createClient } from "@/lib/supabase/client";
import { createOnboardingExtraction, stageOnboarding, submitOnboarding } from "@/lib/api-client/onboarding";
import { recordDocument } from "@/lib/api-client/documents";
import { getProfile } from "@/lib/api-client/profile";
import { queryKeys } from "@/lib/queries/keys";
import { documentMimeType, fileExtension, validateDocument } from "@/lib/ui/files";
import { colors } from "@/lib/ui/tokens";
import { extractProfileFields, type ExtractedProfile } from "@/lib/ui/profile-extraction";
import { ProfileForm, type ProfileOutput } from "@/components/profile-form";

type Step = "source" | "extract" | "review";
type ParserName = "pdfjs-dist" | "tesseract.js";
const ONBOARDING_MIMES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export function OnboardingWizard() {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  const [step, setStep] = useState<Step>("source");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceDocument, setSourceDocument] = useState<DocumentDTO | null>(null);
  const [sourceSha256, setSourceSha256] = useState<string | undefined>();
  const [parserName, setParserName] = useState<ParserName | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExtractedProfile>({});
  const [rawText, setRawText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const stepNumber = step === "source" ? 1 : step === "extract" ? 2 : 3;

  async function hashFile(file: File) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  }

  async function uploadAndParse(file: File) {
    setMessage(null);
    setSourceFile(file);
    const mimeType = documentMimeType(file);
    const validationError = validateDocument(file);
    if (validationError || !ONBOARDING_MIMES.has(mimeType)) {
      setMessage(validationError ?? "Choose a PDF, PNG, JPEG, or WebP document for onboarding.");
      return;
    }
    const userId = profile.data?.viewer.userId;
    if (!userId) { setMessage("Your profile session is still loading. Try again in a moment."); return; }
    setStep("extract");
    setProgress(4);
    try {
      const digestPromise = hashFile(file);
      const storagePath = `${userId}/other/${crypto.randomUUID()}.${fileExtension(file.name)}`;
      const { error } = await createClient().storage.from("student-documents").upload(storagePath, file, { contentType: mimeType, upsert: false });
      if (error) throw new Error(`Private upload failed: ${error.message}`);
      setProgress(12);
      const document = await recordDocument({ storagePath, originalName: file.name, mimeType, sizeBytes: file.size, type: "other" });
      setSourceDocument(document);
      setSourceSha256(await digestPromise);
      queryClient.setQueryData<DocumentDTO[]>(queryKeys.documents, (current = []) => current.some((item) => item.id === document.id) ? current : [document, ...current]);

      let text = "";
      if (mimeType.startsWith("image/")) {
        setParserName("tesseract.js");
        const { createWorker, OEM } = await import("tesseract.js");
        const worker = await createWorker("eng", OEM.LSTM_ONLY, { logger: (event) => { if (event.status === "recognizing text") setProgress(Math.max(14, Math.round(14 + event.progress * 86))); } });
        try { text = (await worker.recognize(file)).data.text; } finally { await worker.terminate(); }
      } else {
        setParserName("pdfjs-dist");
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
        const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        const pages: string[] = [];
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          pages.push(content.items.map((item) => "str" in item ? item.str : "").join(" "));
          setProgress(Math.round(14 + (pageNumber / pdf.numPages) * 86));
        }
        text = pages.join("\n");
        if (!text.trim()) throw new Error("The PDF was uploaded privately, but it has no embedded text. Start over with a clear image/photo of the document, or choose a text-based PDF.");
      }
      const extracted = extractProfileFields(text);
      setRawText(text);
      setDraft(extracted);
      setProgress(100);
      setMessage(Object.values(extracted).some((value) => value !== undefined) ? "Possible values were extracted locally. Review every field before locking your profile." : "Text was extracted but placement fields were sparse. Complete the fields manually using this uploaded document as the source.");
      setStep("review");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This document could not be processed locally.");
      setStep("extract");
    }
  }

  async function finish(values: ProfileOutput) {
    if (!sourceDocument) { setSubmitError("A privately registered source document is required."); return; }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const extractedFields = Object.fromEntries(Object.entries(draft).filter(([, value]) => value !== undefined && value !== "")) as Partial<OnboardingProfileFieldsDTO>;
      const hasExtracted = Object.keys(extractedFields).length > 0;
      const snapshot = await createOnboardingExtraction({
        documentId: sourceDocument.id,
        extractorName: hasExtracted ? (parserName ?? "hybrid") : "manual",
        extractorVersion: parserName === "tesseract.js" ? "7.0.0" : parserName === "pdfjs-dist" ? "6.2.108" : "review-form-v1",
        sourceSha256,
        extractedFields: hasExtracted ? extractedFields : { fullName: values.fullName },
        fieldConfidence: Object.fromEntries(Object.keys(extractedFields).map((key) => [key, 0.65])),
      });
      if (!snapshot.record || !snapshot.latestExtraction) throw new Error("The onboarding extraction record was not created.");
      const fields: OnboardingProfileFieldsDTO = { ...values, linkedinUrl: values.linkedinUrl || null, githubUrl: values.githubUrl || null };
      const staged = await stageOnboarding({ recordId: snapshot.record.id, extractionId: snapshot.latestExtraction.id, expectedUpdatedAt: snapshot.record.updatedAt, fields });
      await submitOnboarding({ recordId: staged.id, expectedUpdatedAt: staged.updatedAt });
      await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.profile }), queryClient.invalidateQueries({ queryKey: queryKeys.studentDashboard })]);
      toast.success("Your verified placement profile is ready.");
      router.replace("/student");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Your profile could not be submitted.");
    } finally { setSubmitting(false); }
  }

  if (profile.isLoading) return <Flex minH="360px" align="center" justify="center"><Spinner /></Flex>;
  return <Box maxW="900px" mx="auto">
    <Flex align="center" gap="3" mb="7"><Text fontWeight="800">Step {stepNumber} of 3</Text><Progress.Root value={(stepNumber / 3) * 100} flex="1" size="sm" colorPalette="orange"><Progress.Track><Progress.Range /></Progress.Track></Progress.Root></Flex>
    {step === "source" && <><Heading as="h1" fontSize={{ base: "3xl", md: "5xl" }} letterSpacing="-.05em">Start with a source document.</Heading><Text color={colors.muted} mt="3" maxW="680px">A PDF or image is required to establish where your profile values came from. It is uploaded to your private document namespace before local extraction.</Text><Box mt="8" bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="20px" p={{ base: "6", md: "8" }} transition=".16s ease" _hover={{ borderColor: colors.signal, boxShadow: "var(--shadow-sm)" }}><Box color={colors.signal}><ScanText size={30} /></Box><Heading as="h2" fontSize="2xl" mt="7">Choose a marksheet, student record, or resume</Heading><Text color={colors.muted} mt="2">Images use local OCR. PDFs use their embedded text and never pretend scanned pages were read.</Text><Button mt="6" bg={colors.signal} color={colors.ink} onClick={() => inputRef.current?.click()}><Upload size={17} />Choose PDF or image</Button></Box>{message && <Alert.Root status="error" mt="5" borderRadius="14px"><Alert.Indicator /><Alert.Content><Alert.Title>Choose another source</Alert.Title><Alert.Description>{message}</Alert.Description></Alert.Content></Alert.Root>}<input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAndParse(file); }} /><Flex mt="6" gap="2" color={colors.muted} fontSize="sm"><ShieldCheck size={18} />Only reviewed profile fields reach onboarding. Raw OCR text stays in this browser.</Flex></>}
    {step === "extract" && <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="20px" p={{ base: "6", md: "9" }} textAlign="center"><Box w="58px" h="58px" mx="auto" display="grid" placeItems="center" borderRadius="full" bg={colors.signalSoft} color={colors.signal}><FileSearch size={28} /></Box><Heading as="h1" fontSize="2xl" mt="5">{message ? "This source needs another pass" : "Securing and reading locally…"}</Heading><Text data-copyable color={colors.muted} mt="2">{message ?? sourceFile?.name}</Text>{!message && <Progress.Root value={progress} mt="6" colorPalette="orange"><Progress.Track><Progress.Range /></Progress.Track></Progress.Root>}<Flex mt="7" gap="3" justify="center" wrap="wrap">{message && <Button variant="outline" onClick={() => { setStep("source"); setMessage(null); }}><ArrowLeft size={17} />Choose another source</Button>}{message && sourceDocument && <Button bg={colors.signal} color={colors.ink} onClick={() => { setDraft({}); setStep("review"); }}>Complete from the document manually <ArrowRight size={17} /></Button>}</Flex></Box>}
    {step === "review" && <><Flex justify="space-between" align="start" gap="4" mb="7"><Box><Heading as="h1" fontSize={{ base: "3xl", md: "4xl" }} letterSpacing="-.04em">Review and lock your profile</Heading><Text color={colors.muted} mt="2">Your source is private and registered. Correct every value before final submission.</Text></Box><Button variant="ghost" onClick={() => setStep("source")}><ArrowLeft size={17} />Start over</Button></Flex>{message && <Alert.Root status="info" mb="5" borderRadius="14px"><Alert.Indicator /><Alert.Content><Alert.Title>Document ready for review</Alert.Title><Alert.Description>{message}</Alert.Description></Alert.Content></Alert.Root>}{submitError && <Alert.Root status="error" mb="5" borderRadius="14px"><Alert.Indicator /><Alert.Content><Alert.Title>Profile not submitted</Alert.Title><Alert.Description>{submitError}</Alert.Description></Alert.Content></Alert.Root>}{rawText && <details style={{ marginBottom: 20 }}><summary style={{ cursor: "pointer", fontWeight: 700 }}>View locally extracted text</summary><Box data-copyable mt="3" maxH="180px" overflowY="auto" whiteSpace="pre-wrap" bg={colors.paperDeep} borderRadius="12px" p="4" color={colors.muted}>{rawText}</Box></details>}<ProfileForm prefill={draft} onReviewSubmit={finish} pending={submitting} submitLabel="Confirm and lock profile" /></>}
  </Box>;
}
