"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/token-storage";

const CARDS = [
  {
    href: "/admin/creators",
    title: "Creator verification",
    desc: "Approve, request changes, or reject profiles before they reach discovery.",
    stat: "Trust & safety",
  },
  {
    href: "/admin/withdrawals",
    title: "Withdrawals",
    desc: "Review creator cash-out requests with gross, commission, and net DT amounts.",
    stat: "Finance queue",
  },
  {
    href: "/admin/coin-packages",
    title: "Coin packages",
    desc: "Tune DT → coin bundles and bonus coins for seasonal campaigns.",
    stat: "Monetization",
  },
  {
    href: "/admin/users",
    title: "Users",
    desc: "Suspend or reactivate accounts when fraud signals or chargebacks appear.",
    stat: "Accounts",
  },
] as const;

export default function AdminHome() {
  const token = useMemo(() => getToken(), []);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    (async () => {
      const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json?.ok || json?.user?.role !== "admin") {
        window.location.href = "/";
        return;
      }
      setRole("admin");
    })();
  }, [token]);

  if (!role) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-16 text-sm text-stone-600 sm:px-6">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
        Loading admin console…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Operations</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Admin console</h1>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Monitor marketplace health from verification through payouts. Each tile opens a focused workspace.
          </p>
        </div>
        <Link href="/" className="text-sm font-medium text-stone-800 underline decoration-primary decoration-2 underline-offset-4 hover:text-primary">
          Exit to site
        </Link>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group relative overflow-hidden rounded-3xl border border-stone-900/10 bg-surface-elevated p-7 shadow-sm transition hover:border-primary/35 hover:shadow-lg"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{c.stat}</span>
            <div className="mt-3 text-xl font-semibold tracking-tight text-stone-900 group-hover:text-primary">{c.title}</div>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{c.desc}</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-stone-900">
              Open
              <span aria-hidden className="transition group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
