"use client";

import { useEffect, type ReactNode } from "react";
import { ChakraProvider, createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";

const system = createSystem(defaultConfig, defineConfig({ theme: { tokens: { colors: { white: { value: "var(--surface)" } } } } }));

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
    return () => { delete document.documentElement.dataset.hydrated; };
  }, []);

  return <ChakraProvider value={system}><QueryProvider>{children}</QueryProvider><Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4500 }} /></ChakraProvider>;
}
