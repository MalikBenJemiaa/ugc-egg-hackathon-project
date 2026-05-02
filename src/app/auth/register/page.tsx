"use client";

import Link from "next/link";
import { useState } from "react";
import { postAuthLandingHref } from "@/lib/post-auth-landing";
import { setToken } from "@/lib/token-storage";

type RegisterJson = {
  ok?: boolean;
  message?: string;
  token?: string;
  user?: { id: string; email: string; role: string; image?: string | null };
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"client" | "creator">("client");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-5xl flex-col px-4 py-10 sm:px-6 lg:flex-row-reverse lg:items-stretch lg:gap-10 lg:px-8 lg:py-14">
      <div className="relative mb-8 hidden flex-1 flex-col justify-between overflow-hidden rounded-3xl border border-stone-900/10 bg-gradient-to-bl from-primary-muted via-secondary to-surface p-10 lg:flex">
        <div className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-primary/25 blur-3xl" aria-hidden />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">Join egg</p>
          <h2 className="mt-4 text-3xl font-semibold leading-tight text-stone-900">Choose how you will use the marketplace.</h2>
          <ul className="mt-6 space-y-3 text-sm text-stone-700">
            <li className="flex gap-2">
              <span className="font-bold text-primary">•</span>
              <span>
                <strong className="text-stone-900">Clients</strong> unlock creator profiles, stack deliverables, and
                pay in coins.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-primary">•</span>
              <span>
                <strong className="text-stone-900">Creators</strong> publish pricing, manage availability, and cash
                out verified earnings.
              </span>
            </li>
          </ul>
        </div>
        <div className="mt-10 rounded-2xl border border-stone-900/10 bg-surface-elevated/90 p-5 text-sm text-stone-600 shadow-sm">
          <p className="font-semibold text-stone-900">Need help deciding?</p>
          <p className="mt-2 leading-relaxed">
            Agencies usually register as <span className="font-medium text-stone-900">Client</span> first, then add
            creator seats later. Solo freelancers pick <span className="font-medium text-stone-900">Creator</span>.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md rounded-3xl border border-stone-900/10 bg-surface-elevated p-8 shadow-xl shadow-stone-900/10 sm:p-10">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Create account</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Pick a role now — you can contact support if you need to migrate later.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setLoading(true);
              try {
                const res = await fetch("/api/auth/register", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ email, password, role }),
                });
                const data = (await res.json()) as RegisterJson;
                if (!res.ok || !data?.ok || !data.token || !data.user) {
                  setError(data?.message ?? "Registration failed.");
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
              <span className="text-sm font-medium text-stone-800">Email</span>
              <input
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/45"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="name@studio.tn"
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-stone-800">Password</span>
              <div className="relative mt-1.5">
                <input
                  className="w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 pr-11 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/45"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-stone-500 transition hover:text-stone-900 focus:outline-none focus-visible:text-stone-900"
                >
                  <PasswordToggleIcon visible={showPassword} />
                </button>
              </div>
              <span className="mt-1 block text-xs text-stone-500">At least 8 characters.</span>
            </label>

            <fieldset>
              <legend className="text-sm font-medium text-stone-800">I am joining as</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(
                  [
                    { value: "client" as const, label: "Client", hint: "Hire creators" },
                    { value: "creator" as const, label: "Creator", hint: "Get booked" },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`cursor-pointer rounded-2xl border px-3 py-3 text-center transition ${
                      role === opt.value
                        ? "border-primary bg-primary-muted/50 ring-2 ring-primary/30"
                        : "border-stone-900/10 bg-secondary/30 hover:border-stone-900/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      className="sr-only"
                      checked={role === opt.value}
                      onChange={() => setRole(opt.value)}
                    />
                    <span className="block text-sm font-semibold text-stone-900">{opt.label}</span>
                    <span className="mt-0.5 block text-[11px] text-stone-500">{opt.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? (
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            <button
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/25 ring-1 ring-stone-900/10 transition hover:brightness-105 disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create account"}
            </button>

            <p className="text-center text-sm text-stone-600">
              Already registered?{" "}
              <Link
                className="font-semibold text-stone-900 underline decoration-primary decoration-2 underline-offset-2 hover:text-primary"
                href="/auth/login"
              >
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function PasswordToggleIcon({ visible }: { visible: boolean }) {
  if (visible) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
