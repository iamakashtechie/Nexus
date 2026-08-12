"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const SESSION_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours (must match JWT_EXPIRES_IN in lib/auth.ts)

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const checkSession = useCallback(() => {
    const loginAt = localStorage.getItem("nexus_login_at");
    const token = localStorage.getItem("nexus_token");

    if (!token || !loginAt) {
      localStorage.removeItem("nexus_token");
      localStorage.removeItem("nexus_login_at");
      router.push("/login");
      return false;
    }

    const elapsed = Date.now() - parseInt(loginAt, 10);
    if (elapsed >= SESSION_DURATION_MS) {
      localStorage.removeItem("nexus_token");
      localStorage.removeItem("nexus_login_at");
      router.push("/login");
      return false;
    }

    return true;
  }, [router]);

  // Periodic check every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkSession();
    }, 30_000);

    return () => clearInterval(interval);
  }, [checkSession]);

  // Check on user interaction (covers frozen-tab scenario)
  useEffect(() => {
    const handleInteraction = () => {
      checkSession();
    };

    window.addEventListener("click", handleInteraction, true);
    window.addEventListener("keydown", handleInteraction, true);
    window.addEventListener("focus", handleInteraction);

    return () => {
      window.removeEventListener("click", handleInteraction, true);
      window.removeEventListener("keydown", handleInteraction, true);
      window.removeEventListener("focus", handleInteraction);
    };
  }, [checkSession]);

  // Initial check on mount
  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return <>{children}</>;
}
