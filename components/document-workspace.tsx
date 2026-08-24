"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, Flex, Heading, Image, Input, NativeSelect, Portal, Text } from "@chakra-ui/react";
import { Download, Eye, FileText, FileUp, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import type { DocumentDTO, DocumentType } from "@/lib/contracts/domain";
import { createClient } from "@/lib/supabase/client";
import { deleteDocument, getDocuments, getDocumentUrl, recordDocument } from "@/lib/api-client/documents";
import { ApiError } from "@/lib/api-client/errors";
import { getProfile } from "@/lib/api-client/profile";
import { queryKeys } from "@/lib/queries/keys";
import { colors } from "@/lib/ui/tokens";
import { formatBytes, formatDate } from "@/lib/ui/format";
import { canPreviewDocument, DOCUMENT_ACCEPT, documentMimeType, fileExtension, validateDocument } from "@/lib/ui/files";
import { ApiErrorAlert, EmptyState, PageSkeleton } from "@/components/async-state";
import { ConfirmDialog } from "@/components/confirm-dialog";

type UploadStage = "idle" | "validating" | "uploading" | "recording" | "failed";

export function DocumentWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>("other");
  const [stage, setStage] = useState<UploadStage>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentDTO | null>(null);
  const [previewing, setPreviewing] = useState<DocumentDTO | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [durableError, setDurableError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const documents = useQuery({ queryKey: queryKeys.documents, queryFn: getDocuments });
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });

  function chooseFile(selected?: File) {
    setUploadError(null);
    if (!selected) return;
    setStage("validating");
    const validationError = validateDocument(selected);
    if (validationError) { setFile(null); setUploadError(validationError); setStage("failed"); return; }
    setFile(selected); setStage("idle");
  }

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !profile.data?.viewer.userId) throw new Error("Your session is still loading. Try again in a moment.");
      const mimeType = documentMimeType(file);
      const storagePath = `${profile.data.viewer.userId}/${type}/${crypto.randomUUID()}.${fileExtension(file.name)}`;
      setStage("uploading");
      const { error } = await createClient().storage.from("student-documents").upload(storagePath, file, { contentType: mimeType, upsert: false });
      if (error) throw new Error(`Secure upload failed: ${error.message}`);
      setStage("recording");
      return recordDocument({ storagePath, originalName: file.name, mimeType, sizeBytes: file.size, type });
    },
    onSuccess: (document) => {
      queryClient.setQueryData<DocumentDTO[]>(queryKeys.documents, (current = []) => [document, ...current]);
      toast.success("Document uploaded securely.");
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
  const openPreview = useMutation({
    mutationFn: async (document: DocumentDTO) => ({ document, url: (await getDocumentUrl(document.id)).signedUrl }),
    onSuccess: ({ document, url }) => { setPreviewing(document); setPreviewUrl(url); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The document could not be opened."),
  });
  if (documents.isLoading || profile.isLoading) return <PageSkeleton rows={3} />;
  if (documents.isError) return <ApiErrorAlert error={documents.error} onRetry={() => documents.refetch()} />;

  const stageLabel = stage === "uploading" ? "Uploading securely…" : stage === "recording" ? "Recording document…" : "Upload document";
  return <>
    <Box bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="18px" p={{ base: "5", md: "7" }}>
      <Flex align={{ base: "start", md: "center" }} justify="space-between" direction={{ base: "column", md: "row" }} gap="5">
        <Box><Flex color={colors.signal} mb="3"><UploadCloud size={26} /></Flex><Heading as="h2" fontSize="xl">Upload a private document</Heading><Text color={colors.muted} mt="2">PDF, image, text, Word, Excel, or PowerPoint up to 50 MiB. Files stay in your private storage namespace.</Text></Box>
        <Button variant="outline" onClick={() => inputRef.current?.click()}><FileUp size={17} />Choose file</Button>
        <Input ref={inputRef} type="file" accept={DOCUMENT_ACCEPT} display="none" onChange={(event) => chooseFile(event.target.files?.[0])} />
      </Flex>
      {file && <Flex mt="5" p="4" bg={colors.paperDeep} borderRadius="12px" align={{ base: "start", sm: "center" }} justify="space-between" gap="4" direction={{ base: "column", sm: "row" }}>
        <Flex gap="3" align="center"><FileText size={20} /><Box><Text fontWeight="700">{file.name}</Text><Text fontSize="sm" color={colors.muted}>{formatBytes(file.size)} · {documentMimeType(file)}</Text></Box></Flex>
        <Flex gap="2" align="center"><NativeSelect.Root size="sm" w="145px"><NativeSelect.Field aria-label="Document category" value={type} onChange={(event) => setType(event.target.value as DocumentType)}><option value="resume">Resume</option><option value="marksheet">Marksheet</option><option value="other">General</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root><Button size="sm" variant="ghost" onClick={() => { setFile(null); setStage("idle"); }}>Clear</Button><Button size="sm" bg={colors.signal} color={colors.ink} onClick={() => upload.mutate()} loading={upload.isPending} loadingText={stageLabel}>{stageLabel}</Button></Flex>
      </Flex>}
      {uploadError && <Alert.Root status="error" mt="4" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>Upload not completed</Alert.Title><Alert.Description>{uploadError}</Alert.Description></Alert.Content></Alert.Root>}
    </Box>
    {durableError && <Alert.Root status="warning" mt="5" borderRadius="12px"><Alert.Indicator /><Alert.Content><Alert.Title>Document kept</Alert.Title><Alert.Description>{durableError}</Alert.Description></Alert.Content></Alert.Root>}
    <Box mt="8"><Heading as="h2" fontSize="2xl" mb="4">Your document library</Heading>{documents.data?.length ? <Flex direction="column" gap="3">{documents.data.map((document) => <Flex key={document.id} bg={colors.surface} border="1px solid" borderColor={colors.line} borderRadius="14px" p="4" align={{ base: "start", sm: "center" }} justify="space-between" direction={{ base: "column", sm: "row" }} gap="4"><Flex gap="3" align="center"><Box color={colors.signal}><FileText size={22} /></Box><Box><Text fontWeight="700">{document.originalName}</Text><Text color={colors.muted} fontSize="sm" textTransform="capitalize">{document.type} · {formatBytes(document.sizeBytes)} · Uploaded {formatDate(document.uploadedAt)}</Text></Box></Flex><Flex gap="2"><Button size="sm" variant="outline" loading={openPreview.isPending && openPreview.variables?.id === document.id} onClick={() => openPreview.mutate(document)}><Eye size={16} />View</Button><Button size="sm" variant="ghost" color={colors.danger} onClick={() => setDeleting(document)}><Trash2 size={16} />Delete</Button></Flex></Flex>)}</Flex> : <EmptyState title="Your document library is empty" description="Upload resumes, marksheets, certificates, notes, and other placement documents here." />}</Box>
    <ConfirmDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)} title="Delete this document?" description={`Delete ${deleting?.originalName ?? "this document"}. Documents attached to applications will be kept.`} confirmLabel="Delete document" onConfirm={() => deleting && remove.mutate(deleting.id)} pending={remove.isPending} destructive />
    <Dialog.Root open={Boolean(previewing)} onOpenChange={(event) => { if (!event.open) { setPreviewing(null); setPreviewUrl(null); } }} size="cover"><Portal><Dialog.Backdrop /><Dialog.Positioner p={{ base: "2", md: "6" }}><Dialog.Content bg={colors.surface} borderRadius="18px" overflow="hidden"><Dialog.Header borderBottom="1px solid" borderColor={colors.line}><Box><Dialog.Title>{previewing?.originalName}</Dialog.Title><Text color={colors.muted} fontSize="sm">Private signed view · expires shortly</Text></Box><Dialog.CloseTrigger asChild><Button variant="ghost" aria-label="Close document viewer"><X size={19} /></Button></Dialog.CloseTrigger></Dialog.Header><Dialog.Body p="0" minH="70vh" bg={colors.paperDeep}>{previewUrl && previewing && (canPreviewDocument(previewing.mimeType) ? previewing.mimeType.startsWith("image/") ? <Flex minH="70vh" align="center" justify="center" p="4"><Image src={previewUrl} alt={previewing.originalName} maxW="100%" maxH="70vh" objectFit="contain" /></Flex> : <iframe src={previewUrl} title={previewing.originalName} style={{ width: "100%", height: "70vh", border: 0, background: "white" }} /> : <Flex minH="70vh" align="center" justify="center" direction="column" gap="4" p="8" textAlign="center"><FileText size={46} /><Heading as="h3" fontSize="xl">Preview is not available for this file type</Heading><Text color={colors.muted}>Open the signed file in a compatible desktop application.</Text><Button asChild bg={colors.signal} color={colors.ink}><a href={previewUrl} target="_blank" rel="noreferrer"><Download size={17} />Open or download</a></Button></Flex>)}</Dialog.Body></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>
  </>;
}
