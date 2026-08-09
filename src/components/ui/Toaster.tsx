"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "./ThemeProvider";

export function Toaster() {
  const { resolvedTheme } = useTheme();

  const sonnerTheme =
    resolvedTheme === "dim" || resolvedTheme === "offwhite"
      ? "light"
      : resolvedTheme;

  return (
    <SonnerToaster
      position="bottom-right"
      theme={sonnerTheme}
      toastOptions={{
        classNames: {
          toast:
            "border border-border bg-surface text-text backdrop-blur-sm shadow-lg",
          success: "border-green-500/40",
          error: "border-red-500/40",
          info: "border-border",
          description: "text-muted",
        },
      }}
      richColors
      closeButton
      duration={3200}
    />
  );
}