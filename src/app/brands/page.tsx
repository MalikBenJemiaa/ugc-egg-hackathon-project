"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { getToken } from "@/lib/token-storage";

type Brand = {
  id: string;
  email: string;
  image: string | null;
  createdAt: string;
};

type BrandsResponse =
  | { ok: true; brands: Brand[] }
  | { ok: false; code: string; message: string };

function brandNameFromEmail(email: string) {
  const i = email.indexOf("@");
  return i > 0 ? email.slice(0, i) : email;
}

export default function BrandsPage() {
  const token = useMemo(() => getToken(), []);
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/brands", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as BrandsResponse;
        if (cancelled) return;
        if (data.ok) setBrands(data.brands);
        else setError(data.message ?? "Failed to load brands.");
      } catch {
        if (!cancelled) setError("Failed to load brands.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="relative overflow-hidden rounded-3xl border border-stone-900/10 bg-surface-elevated p-8 shadow-lg shadow-stone-900/5 sm:p-12">
        <div
          className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">All brands</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Brands looking for creators
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-stone-600">
            Every brand below has an active account on egg. Browse who&apos;s here, get familiar with the
            logos, and stay ready when an order lands in your inbox.
          </p>
        </div>
      </header>

      <section className="mt-10 sm:mt-12">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">
              All brands
            </h2>
            <p className="mt-1 max-w-2xl text-stone-600">
              {brands == null
                ? "Loading brands…"
                : `${brands.length} brand${brands.length === 1 ? "" : "s"} on the platform.`}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-stone-800 underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
          >
            ← Back home
          </Link>
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}

        {brands && brands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-900/15 bg-surface-elevated/60 p-10 text-center text-stone-600">
            No brands yet. Check back soon.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(brands ?? Array.from({ length: 6 }, (_, i) => ({ id: `skeleton-${i}` }) as Partial<Brand> & { id: string })).map(
            (b) => {
              const isLoading = brands == null;
              const name = "email" in b && b.email ? brandNameFromEmail(b.email) : "";
              return (
                <article
                  key={b.id}
                  className="group flex items-center gap-4 rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
                >
                  {isLoading ? (
                    <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-stone-900/10" />
                  ) : (
                    <UserAvatar
                      name={name || "Brand"}
                      image={(b as Brand).image}
                      className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-accent-warm/20 ring-1 ring-stone-900/10"
                      initialsTextClassName="text-lg"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {isLoading ? (
                      <>
                        <div className="h-4 w-32 animate-pulse rounded bg-stone-900/10" />
                        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-stone-900/5" />
                      </>
                    ) : (
                      <>
                        <h3 className="truncate text-base font-semibold capitalize tracking-tight text-stone-900">
                          {name || "Brand"}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-stone-500">{(b as Brand).email}</p>
                        <p className="mt-2 text-xs text-stone-500">
                          Joined{" "}
                          <span className="text-stone-700">
                            {new Date((b as Brand).createdAt).toLocaleDateString()}
                          </span>
                        </p>
                      </>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}
