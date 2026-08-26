"use client";

import { useEffect, type ReactNode } from "react";
import { ChakraProvider, createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/query-provider";

const system = createSystem(defaultConfig, defineConfig({
  theme: {
    tokens: {
      colors: {
        white: { value: "var(--surface-strong)" },
        black: { value: "var(--ink)" },
      },
    },
    semanticTokens: {
      colors: {
        bg: {
          DEFAULT: { value: "var(--paper)" },
          subtle: { value: "var(--paper-deep)" },
          muted: { value: "var(--surface)" },
          emphasized: { value: "var(--surface-strong)" },
          panel: { value: "var(--surface)" },
          inverted: { value: "var(--neutral-solid)" },
        },
        fg: {
          DEFAULT: { value: "var(--ink)" },
          muted: { value: "var(--ink-soft)" },
          subtle: { value: "var(--ink-soft)" },
          inverted: { value: "var(--on-neutral)" },
          error: { value: "var(--danger)" },
          warning: { value: "var(--warning)" },
          success: { value: "var(--success)" },
          info: { value: "var(--info)" },
        },
        border: {
          DEFAULT: { value: "var(--line)" },
          muted: { value: "var(--line)" },
          subtle: { value: "var(--line)" },
          emphasized: { value: "var(--line-strong)" },
          inverted: { value: "var(--ink)" },
        },
        gray: {
          contrast: { value: "var(--on-neutral)" },
          fg: { value: "var(--ink)" },
          subtle: { value: "var(--paper-deep)" },
          muted: { value: "var(--surface-strong)" },
          emphasized: { value: "var(--line)" },
          solid: { value: "var(--neutral-solid)" },
          focusRing: { value: "var(--focus)" },
          border: { value: "var(--line-strong)" },
        },
        red: {
          contrast: { value: "var(--on-signal)" },
          fg: { value: "var(--danger)" },
          subtle: { value: "var(--danger-soft)" },
          muted: { value: "var(--danger-soft)" },
          solid: { value: "var(--danger)" },
          focusRing: { value: "var(--danger)" },
          border: { value: "var(--danger)" },
        },
        orange: {
          contrast: { value: "var(--on-signal)" },
          fg: { value: "var(--warning)" },
          subtle: { value: "var(--warning-soft)" },
          muted: { value: "var(--warning-soft)" },
          solid: { value: "var(--signal)" },
          focusRing: { value: "var(--focus)" },
          border: { value: "var(--warning)" },
        },
        green: {
          contrast: { value: "var(--on-signal)" },
          fg: { value: "var(--success)" },
          subtle: { value: "var(--success-soft)" },
          muted: { value: "var(--success-soft)" },
          solid: { value: "var(--success)" },
          focusRing: { value: "var(--success)" },
          border: { value: "var(--success)" },
        },
        blue: {
          contrast: { value: "var(--on-signal)" },
          fg: { value: "var(--info)" },
          subtle: { value: "var(--info-soft)" },
          muted: { value: "var(--info-soft)" },
          solid: { value: "var(--info)" },
          focusRing: { value: "var(--info)" },
          border: { value: "var(--info)" },
        },
      },
    },
  },
  globalCss: {
    "button, [role=button]": { color: "var(--ink)" },
    ".chakra-button:focus-visible": { outlineColor: "var(--focus)" },
  },
}));

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    const storedTheme = localStorage.getItem("placeflow-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      document.documentElement.dataset.theme = storedTheme;
    }
    document.documentElement.dataset.hydrated = "true";
    return () => { delete document.documentElement.dataset.hydrated; };
  }, []);

  return <ChakraProvider value={system}><QueryProvider>{children}</QueryProvider><Toaster position="top-right" richColors closeButton toastOptions={{ duration: 4500 }} /></ChakraProvider>;
}
