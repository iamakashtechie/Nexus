"use client";

import { useCallback } from "react";
import { toast } from "sonner";

function getAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("nexus_token") ?? "";
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useDownload() {
  const downloadFile = useCallback(
    async (url: string, fallbackName: string, successMessage: string) => {
      toast.info("Preparing download. It will start shortly.");
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      });
      if (res.status === 401) {
        localStorage.removeItem("nexus_token");
        localStorage.removeItem("nexus_login_at");
        window.location.href = "/login";
        return;
      }
      if (!res.ok) {
        toast.error("Download failed.");
        return;
      }
      const blob = await res.blob();
      const fileName =
        res.headers
          .get("content-disposition")
          ?.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName;
      saveBlob(blob, fileName);
      toast.success(successMessage);
    },
    []
  );

  return { downloadFile };
}