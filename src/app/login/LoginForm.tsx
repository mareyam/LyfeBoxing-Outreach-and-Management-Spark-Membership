"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) return "/";
  return value;
}

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Wrong password.");
        return;
      }
      const next = typeof window === "undefined" ? "/" : safeNext(new URLSearchParams(window.location.search).get("next"));
      router.push(next);
      router.refresh();
    } catch {
      setError("Couldn't sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-16">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">Lyfe Boxing</h1>
        <p className="text-sm text-neutral-500 mt-1">Enter the site password to continue.</p>
        <input
          type="text"
          name="username"
          autoComplete="username"
          defaultValue="lyfe-boxing"
          tabIndex={-1}
          aria-hidden="true"
          className="absolute h-0 w-0 overflow-hidden"
        />
        <label className="block text-xs font-medium text-neutral-500 mt-5 mb-1" htmlFor="site-password">
          Password
        </label>
        <input
          id="site-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
        />
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="mt-4 w-full rounded-full bg-neutral-900 text-white px-4 py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
