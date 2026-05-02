"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { getToken } from "@/lib/token-storage";

type CreatorCard = {
  id: string;
  name: string;
  image?: string | null;
  city: string | null;
  niches: string[];
  tier: "standard" | "premium";
  ratingAvg: number;
  ratingCount: number;
  platforms?: string[];
  fromCoins?: number | null;
};

type CreatorsResponse =
  | { ok: true; premium: CreatorCard[]; standard: CreatorCard[] }
  | { ok: false; code: string; message: string };

function IconLock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 1 1 8 0v3" />
      <circle cx="12" cy="15.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LockedCreatorCard({ creator }: { creator: CreatorCard }) {
  const platform = creator.platforms?.[0];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-900/10 bg-surface-elevated shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="select-none blur-[6px] transition group-hover:blur-[5px]" aria-hidden>
        <div className="flex gap-4 p-5 sm:p-6">
          <UserAvatar
            name={creator.name}
            image={creator.image}
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-accent-warm/20 ring-1 ring-stone-900/10"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-semibold tracking-tight text-stone-900">{creator.name}</h3>
              {creator.tier === "premium" ? (
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stone-900 ring-1 ring-stone-900/10">
                  Premium
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate text-sm text-stone-600">
              {creator.city ?? "Tunisia"}
              {creator.niches[0] ? ` · ${creator.niches[0]}` : ""}
              {platform ? ` · ${platform}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
              {creator.fromCoins != null ? (
                <span className="font-medium text-stone-700">from {creator.fromCoins} coins</span>
              ) : null}
              <span>★ {creator.ratingAvg} ({creator.ratingCount})</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-stone-900/10 px-5 py-3">
          {(creator.niches ?? []).slice(0, 3).map((n) => (
            <span
              key={n}
              className="rounded-full border border-stone-900/10 bg-secondary/80 px-2.5 py-0.5 text-xs font-medium text-stone-700"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900/35 px-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-900 text-white shadow-lg ring-2 ring-white/30">
          <IconLock className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-white drop-shadow">Profile locked</p>
        <p className="max-w-[16rem] text-xs leading-relaxed text-white/85">
          Sign in and add coins to unlock contact details, pricing, and orders.
        </p>
      </div>
    </div>
  );
}

export function CreatorsLockedShowcase() {
  const [creators, setCreators] = useState<CreatorCard[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/creators?availableOnly=false");
        const json = (await res.json()) as CreatorsResponse;
        if (cancelled) return;
        if (!json.ok) {
          setError(json.message);
          return;
        }
        setCreators([...(json.premium ?? []), ...(json.standard ?? [])]);
      } catch {
        if (!cancelled) setError("Could not load creators.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-800">{error}</div>
    );
  }

  if (creators === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-2xl border border-stone-900/10 bg-surface-elevated p-5"
          >
            <div className="flex gap-4">
              <div className="h-16 w-16 shrink-0 rounded-2xl bg-stone-200/80" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 rounded bg-stone-200/80" />
                <div className="h-3 w-28 rounded bg-stone-200/60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!creators.length) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-900/20 bg-surface/50 p-8 text-center">
        <p className="font-medium text-stone-900">No creators yet</p>
        <p className="mt-1 text-sm text-stone-600">Verified profiles will appear here as they go live.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {creators.map((c) => (
          <LockedCreatorCard key={c.id} creator={c} />
        ))}
      </div>
      {!isLoggedIn ? (
        <div className="rounded-2xl border border-primary/30 bg-primary-muted/40 p-5 text-sm text-stone-800 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <p className="leading-relaxed">
            <span className="font-semibold text-stone-900">Want to talk to these creators?</span> Sign in and top up
            your coin wallet to unlock full profiles.
          </p>
          <div className="mt-3 flex gap-2 sm:mt-0">
            <Link
              href="/auth/login"
              className="inline-flex h-10 items-center justify-center rounded-full border border-stone-900/15 bg-surface-elevated px-5 text-sm font-medium text-stone-800"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-stone-900 ring-1 ring-stone-900/10"
            >
              Get started
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
