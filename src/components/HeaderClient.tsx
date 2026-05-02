"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { clearToken, getToken } from "@/lib/token-storage";

function IconCoin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5h4.25a1.75 1.75 0 0 1 0 3.5H10a1.75 1.75 0 0 0 0 3.5h4.5" />
      <path d="M12 7.5v1.5M12 16v1.5" />
    </svg>
  );
}

type MeResponse =
  | {
      ok: true;
      user: { id: string; email: string; role: string; image?: string | null };
      wallet: { balanceCoins: number };
    }
  | { ok: false; code: string; message: string };

export function HeaderClient() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    setToken(getToken());
  }, []);

  useEffect(() => {
    function onRefresh() {
      setRefreshNonce((n) => n + 1);
    }
    function onFocus() {
      setRefreshNonce((n) => n + 1);
    }
    window.addEventListener("wallet:refresh", onRefresh);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("wallet:refresh", onRefresh);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setMe(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as MeResponse;
      if (!cancelled) setMe(data);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, refreshNonce]);

  if (!token) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/auth/login"
          className="rounded-full border border-stone-900/12 bg-surface-elevated/80 px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-secondary"
        >
          Login
        </Link>
        <Link
          href="/auth/register"
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-stone-900 shadow-md shadow-primary/20 ring-1 ring-stone-900/10 transition hover:brightness-105"
        >
          Get started
        </Link>
      </div>
    );
  }

  const coins = me && me.ok ? me.wallet.balanceCoins : null;
  const role = me && me.ok ? me.user.role : null;
  const displayName =
    me && me.ok
      ? (() => {
          const e = me.user.email;
          const i = e.indexOf("@");
          return i > 0 ? e.slice(0, i) : e;
        })()
      : "";

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {me && me.ok ? (
        <Link
          href={
            me.user.role === "creator"
              ? `/creators/${me.user.id}`
              : me.user.role === "admin"
                ? "/admin"
                : "/dashboard/client"
          }
          className="relative shrink-0 rounded-full ring-stone-900/15 ring-offset-2 ring-offset-surface-elevated transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={
            me.user.role === "creator"
              ? "Your creator profile"
              : me.user.role === "admin"
                ? "Admin"
                : "Your profile"
          }
        >
          <UserAvatar
            name={displayName || "User"}
            image={me.user.image}
            className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-accent-warm/20 ring-1 ring-stone-900/10"
          />
        </Link>
      ) : null}
      {role === "admin" ? (
        <Link
          href="/admin"
          className="hidden rounded-full border border-stone-900/10 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-stone-800 transition hover:border-primary/30 sm:inline-flex sm:items-center sm:justify-center"
        >
          Admin
        </Link>
      ) : null}
      <div
        className="hidden items-center gap-2 rounded-full border border-primary/25 bg-primary-muted/40 px-3 py-1.5 text-sm text-stone-800 sm:flex"
        title="Wallet balance (coins)"
        aria-label={`Wallet balance: ${coins === null ? "loading" : `${coins} coins`}`}
      >
        <IconCoin className="h-4 w-4 text-primary" />
        <span className="tabular-nums font-semibold text-stone-900">{coins === null ? "…" : coins}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          clearToken();
          window.location.href = "/";
        }}
        className="rounded-full border border-stone-900/12 bg-surface-elevated px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:bg-secondary"
      >
        Logout
      </button>
    </div>
  );
}
