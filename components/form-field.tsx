import type { ReactNode } from "react";
import { Field, Flex, Text } from "@chakra-ui/react";
import { CheckCircle2 } from "lucide-react";
import { colors } from "@/lib/ui/tokens";

export function FormField({ label, error, helper, required, valid, children }: { label: string; error?: string; helper?: string; required?: boolean; valid?: boolean; children: ReactNode }) {
  return <Field.Root invalid={Boolean(error)} required={required}><Flex w="full" justify="space-between" align="center"><Field.Label fontWeight="700">{label}<Field.RequiredIndicator /></Field.Label>{valid && <Text color={colors.success} aria-label="Valid"><CheckCircle2 size={16} /></Text>}</Flex>{children}{error ? <Field.ErrorText>{error}</Field.ErrorText> : helper ? <Field.HelperText color={colors.muted}>{helper}</Field.HelperText> : null}</Field.Root>;
}
