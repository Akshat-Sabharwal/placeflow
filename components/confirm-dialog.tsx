"use client";

import { Button, Dialog, Portal, Text } from "@chakra-ui/react";
import { colors } from "@/lib/ui/tokens";

export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, pending = false, destructive = false }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string; onConfirm: () => void; pending?: boolean; destructive?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={(event) => onOpenChange(event.open)} role="alertdialog"><Portal><Dialog.Backdrop bg="blackAlpha.600" /><Dialog.Positioner><Dialog.Content bg={colors.surface} color={colors.ink} border="1px solid" borderColor={colors.line} borderRadius="18px" p="2"><Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header><Dialog.Body><Text color={colors.muted}>{description}</Text></Dialog.Body><Dialog.Footer><Dialog.ActionTrigger asChild><Button variant="ghost" disabled={pending} _hover={{ bg: colors.paperDeep }}>Cancel</Button></Dialog.ActionTrigger><Button bg={destructive ? colors.danger : colors.signal} color={destructive ? colors.paper : colors.ink} _hover={{ filter: "brightness(1.08)" }} onClick={onConfirm} loading={pending}>{confirmLabel}</Button></Dialog.Footer></Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}
