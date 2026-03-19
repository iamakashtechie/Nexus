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
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Nexus
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
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
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-colors"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#E24B4A" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading ? "Unlocking..." : "Unlock Nexus"}
          </button>
        </form>
      </div>
    </div>
  );
}
