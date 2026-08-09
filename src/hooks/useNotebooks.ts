"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Notebook } from "@prisma/client";
import { useApi } from "@/hooks/useApi";

export type NotebookWithCount = Notebook & { _count: { notes: number } };

export function useNotebooks() {
  const { apiFetch } = useApi();
  const [notebooks, setNotebooks] = useState<NotebookWithCount[]>([]);

  const fetchNotebooks = useCallback(async () => {
    try {
      const res = await apiFetch<{
        success: boolean;
        data: NotebookWithCount[];
      }>("/api/notebooks");
      if (res.success) setNotebooks(res.data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load folders"
      );
    }
  }, [apiFetch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchNotebooks();
  }, [fetchNotebooks]);

  const createNotebook = useCallback(
    async (name: string) => {
      try {
        const res = await apiFetch<{
          success: boolean;
          data: NotebookWithCount;
        }>("/api/notebooks", {
          method: "POST",
          body: JSON.stringify({ name }),
        });
        if (res.success) {
          setNotebooks((prev) => [...prev, res.data]);
          toast.success("Folder created");
        }
        return res.success;
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Create failed");
        return false;
      }
    },
    [apiFetch]
  );

  const renameNotebook = useCallback(
    async (id: string, name: string) => {
      try {
        await apiFetch(`/api/notebooks/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name }),
        });
        await fetchNotebooks();
        toast.success("Folder renamed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Rename failed");
      }
    },
    [apiFetch, fetchNotebooks]
  );

  const deleteNotebook = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/notebooks/${id}`, { method: "DELETE" });
        setNotebooks((prev) => prev.filter((n) => n.id !== id));
        toast.success("Folder deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [apiFetch]
  );

  return {
    notebooks,
    fetchNotebooks,
    createNotebook,
    renameNotebook,
    deleteNotebook,
  };
}