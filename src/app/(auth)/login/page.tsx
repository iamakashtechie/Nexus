"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.push("/notes");
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
          <div>
            <input
              type="password"
              placeholder="Enter your passphrase"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all bg-surface border border-border text-text focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder:text-muted/60 shadow-sm"
            />
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
