"use client";

import Link from "next/link";
import { useState } from "react";
import { postAuthLandingHref } from "@/lib/post-auth-landing";
import { setToken } from "@/lib/token-storage";

type LoginJson = {
  ok?: boolean;
  message?: string;
  token?: string;
  user?: { id: string; email: string; role: string; image?: string | null };
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col px-4 py-10 sm:px-6 lg:flex-row lg:items-stretch lg:gap-10 lg:px-8 lg:py-14">
      <div className="relative mb-8 hidden flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-stone-900/10 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-primary/30 blur-3xl" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-muted">egg</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight">Welcome back to your creator wallet.</h2>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-stone-300">
            Pick up where you left off: unlock profiles, track coin spend, and manage orders without digging through
            email threads.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-stone-900/10 bg-surface-elevated p-8 shadow-xl shadow-stone-900/10 sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Use your email and password to access your wallet, orders, and saved creators.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                const res = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email, password }),
                });
                const data = (await res.json()) as LoginJson;
                if (!res.ok || !data?.ok || !data.token || !data.user) {
                  setError(data?.message ?? "Login failed.");
                  return;
                }
                setToken(data.token);
                window.location.href = postAuthLandingHref(data.user);
              } finally {
                setLoading(false);
              }
            }}
          >
            <label className="block">
              <span className="text-sm font-medium text-stone-800">Work email</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/45"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@company.tn"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-800">Password</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/45"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>

            {error ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/25 ring-1 ring-stone-900/10 transition hover:brightness-105 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Continue"}
            </button>

            <p className="text-center text-sm text-stone-600">
              New to egg?{" "}
              <Link
                className="font-semibold text-stone-900 underline decoration-primary decoration-2 underline-offset-2 hover:text-primary"
                href="/auth/register"
              >
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
