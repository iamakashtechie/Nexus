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

    return res.json();
  }, []);

  return { apiFetch };
}
