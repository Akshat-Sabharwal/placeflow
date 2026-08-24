"use client";

import { useEffect, type ReactNode } from "react";
import { ChakraProvider, defaultSystem } from "@chakra-ui/react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
    return () => { delete document.documentElement.dataset.hydrated; };
  }, []);

  return <ChakraProvider value={defaultSystem}><QueryProvider>{children}</QueryProvider><Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4500 }} /></ChakraProvider>;
}
