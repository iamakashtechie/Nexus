"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const SESSION_DURATION_MS = 5 * 60 * 60 * 1000; // 5 hours (must match JWT_EXPIRES_IN in lib/auth.ts)

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated (covers browser back button / bfcache)
  const redirectIfAuthenticated = useCallback(() => {
    const token = localStorage.getItem("nexus_token");
    const loginAt = localStorage.getItem("nexus_login_at");

    if (token && loginAt) {
      const elapsed = Date.now() - parseInt(loginAt, 10);
      if (elapsed < SESSION_DURATION_MS) {
        // Replace the current history entry so back button can't loop
        window.history.replaceState(null, "", "/notes");
        router.replace("/notes");
      }
    }
  }, [router]);

  useEffect(() => {
    // Check on mount (handles direct navigation and bfcache restore)
    redirectIfAuthenticated();

    // Also check on popstate (browser back/forward button)
    const handlePopState = () => redirectIfAuthenticated();
    window.addEventListener("popstate", handlePopState);

    // Handle page becoming visible again (bfcache in Safari/Chrome)
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) redirectIfAuthenticated();
    };
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [redirectIfAuthenticated]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!data.success) {
        setError("Invalid password. Try again.");
        return;
      }

      // Store token for API calls
      localStorage.setItem("nexus_token", data.token);
      localStorage.setItem("nexus_login_at", Date.now().toString());
      // Use replace so /login doesn't stay in browser history
      router.replace("/notes");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text selection:bg-accent/20">
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-10 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-2xl tracking-tighter mb-4 shadow-sm">N</div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Nexus
          </h1>
          <p className="mt-2 text-sm text-muted">
            Your personal knowledge base
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter your passphrase"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full pl-4 pr-10 py-3 rounded-xl text-sm outline-none transition-all bg-surface border border-border text-text focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder:text-muted/60 shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text transition-colors p-1"
              title={showPassword ? "Hide Password" : "Show Password"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-500 font-medium text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all bg-accent hover:bg-accent-hover text-white shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? "Unlocking..." : "Unlock Nexus"}
            {!loading && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>}
          </button>
        </form>
      </div>
    </div>
  );
}
