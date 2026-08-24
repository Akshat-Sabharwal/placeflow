"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/api-client/settings";
import { queryKeys } from "@/lib/queries/keys";

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("placeflow-theme", theme);
}

export function ThemeSync() {
  const settings = useQuery({ queryKey: queryKeys.settings, queryFn: getSettings, staleTime: 60_000 });
  useEffect(() => { if (settings.data) applyTheme(settings.data.themePreference); }, [settings.data]);
  return null;
}
