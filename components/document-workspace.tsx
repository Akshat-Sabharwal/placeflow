"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Flex, Heading, Input, Text } from "@chakra-ui/react";
import { FileUp, FileText, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import type { DocumentDTO } from "@/lib/contracts/domain";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, getDocuments, recordDocument } from "@/lib/api-client/documents";
import { ApiError } from "@/lib/api-client/errors";
import { getProfile } from "@/lib/api-client/profile";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { formatBytes, formatDate } from "@/lib/ui/format";
import { validatePdf } from "@/lib/ui/files";
import { ApiErrorAlert, EmptyState, PageSkeleton } from "@/components/async-state";
import { ConfirmDialog } from "@/components/confirm-dialog";

type UploadStage = "idle" | "validating" | "uploading" | "recording" | "failed";

export function DocumentWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentDTO | null>(null);
  const [durableError, setDurableError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const documents = useQuery({ queryKey: queryKeys.documents, queryFn: getDocuments });
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });

  function chooseFile(selected?: File) {
    setUploadError(null);
    if (!selected) return;
    setStage("validating");
    const validationError = validatePdf(selected);
    if (validationError) { setUploadError(validationError); setStage("failed"); return; }
    setFile(selected); setStage("idle");
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !profile.data?.viewer.userId) throw new Error("Your session is still loading. Try again in a moment.");
      const storagePath = `${profile.data.viewer.userId}/resume/${crypto.randomUUID()}.pdf`;
      setStage("uploading");
      const { error } = await createClient().storage.from("student-documents").upload(storagePath, file, { contentType: "application/pdf", upsert: false });
      if (error) throw new Error(`Secure upload failed: ${error.message}`);
      setStage("recording");
      return recordDocument({ storagePath, originalName: file.name, mimeType: "application/pdf", sizeBytes: file.size, type: "resume" });
    },
    onSuccess: (document) => {
      queryClient.setQueryData<DocumentDTO[]>(queryKeys.documents, (current = []) => [document, ...current]);
      toast.success("Resume uploaded securely.");
      setFile(null); setStage("idle"); setUploadError(null);
      if (inputRef.current) inputRef.current.value = "";
    },
    onError: (error) => { setStage("failed"); setUploadError(error instanceof Error ? error.message : "The upload could not be completed."); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: async () => { toast.success("Document deleted."); setDeleting(null); setDurableError(null); await queryClient.invalidateQueries({ queryKey: queryKeys.documents }); },
    onError: (error) => { setDeleting(null); setDurableError(error instanceof ApiError && error.code === "DOCUMENT_IN_USE" ? "This resume is attached to an existing application and cannot be deleted." : error instanceof Error ? error.message : "The document could not be deleted."); },
  });
  if (documents.isLoading || profile.isLoading) return <PageSkeleton rows={3} />;
  if (documents.isError) return <ApiErrorAlert error={documents.error} onRetry={() => documents.refetch()} />;

  const stageLabel = stage === "uploading" ? "Uploading securely…" : stage === "recording" ? "Recording document…" : "Upload resume";
  return <><Box bg="white" border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}><Flex align={{ base: "start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap="5"><Box><Flex color={colors.signal} mb="3"><UploadCloud size={26} /></Flex><Heading as="h2" fontSize="xl">Upload a private resume</Heading><Text color={colors.muted} mt="2">One PDF, up to 10 MiB. The original filename is never used as a storage key.</Text></Box><Button variant="outline" onClick={() => inputRef.current?.click()}><FileUp size={17} />Choose PDF</Button><Input ref={inputRef} type="file" accept="application/pdf,.pdf" display="none" onChange={(event) => chooseFile(event.target.files?.[0])} /></Flex>{file && <Flex mt="5" p="4" bg={colors.paper} borderRadius="12px" align={{ base: "start", sm: "center" }} justify="space-between" gap="4" direction={{ base: "column", sm: "row" }}><Flex gap="3" align="center"><FileText size={20} /><Box><Text fontWeight="700">{file.name}</Text><Text fontSize="sm" color={colors.muted}>{formatBytes(file.size)} · PDF</Text></Box></Flex><Flex gap="2"><Button size="sm" variant="ghost" onClick={() => { setFile(null); setStage("idle"); }}>Clear</Button><Button size="sm" bg={colors.signal} color={colors.ink} onClick={() => upload.mutate()} loading={upload.isPending} loadingText={stageLabel}>{stageLabel}</Button></Flex></Flex>}{uploadError && <Alert.Root status="error" mt="4" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>Upload not completed</Alert.Title><Alert.Description>{uploadError}{stage === "failed" && uploadError.includes("Recording") ? " The server will reconcile the unregistered object; your document list has not been changed." : ""}</Alert.Description></Alert.Content></Alert.Root>}</Box>{durableError && <Alert.Root status="warning" mt="5" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>Document kept</Alert.Title><Alert.Description>{durableError}</Alert.Description></Alert.Content></Alert.Root>}<Box mt="8"><Heading as="h2" fontSize="2xl" mb="4">Your documents</Heading>{documents.data?.length ? <Flex direction="column" gap="3">{documents.data.map((document) => <Flex key={document.id} bg="white" border="1px solid" borderColor={colors.line} borderRadius="14px" p="4" align={{ base: "start", sm: "center" }} justify="space-between" direction={{ base: "column", sm: "row" }} gap="4"><Flex gap="3" align="center"><Box color={colors.signal}><FileText size={22} /></Box><Box><Text fontWeight="700">{document.originalName}</Text><Text color={colors.muted} fontSize="sm">{formatBytes(document.sizeBytes)} · Uploaded {formatDate(document.uploadedAt)}</Text></Box></Flex><Button size="sm" variant="ghost" color={colors.danger} onClick={() => setDeleting(document)}><Trash2 size={16} />Delete</Button></Flex>)}</Flex> : <EmptyState title="Upload a resume before applying to a drive" description="Your private resume will be available for selection when you apply." />}</Box><ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} title="Delete this resume?" description={`Delete ${deleting?.originalName ?? "this document"}. This cannot be undone, and documents attached to applications will be kept.`} confirmLabel="Delete document" onConfirm={() => deleting && remove.mutate(deleting.id)} pending={remove.isPending} destructive /></>;
}
