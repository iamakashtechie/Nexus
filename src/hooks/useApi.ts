import { useCallback } from "react";

export function useApi() {
  const apiFetch = useCallback(async <T,>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> => {
    function getToken(): string {
      if (typeof window === "undefined") return "";
      return localStorage.getItem("nexus_token") ?? "";
    }

    const res = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
        ...options.headers,
      },
    });

    if (res.status === 401) {
      localStorage.removeItem("nexus_token");
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }

    const data = await res.json();
    if (!res.ok) {
      const message =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : `Request failed: ${res.status}`;
      throw new Error(message);
    }

    return data as T;
  }, []);

  return { apiFetch };
}
