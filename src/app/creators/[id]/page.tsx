"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/token-storage";
import { CreatorWalletCheckout } from "@/components/CreatorWalletCheckout";
import { CreatorStudioPanel } from "@/components/CreatorStudioPanel";
import { CreatorProfileEditor, type CreatorEditorInitial } from "@/components/CreatorProfileEditor";
import { UserAvatar } from "@/components/UserAvatar";
import { coinsToDt } from "@/lib/coins";

type CreatorDetailsResponse =
  | {
      ok: true;
      unlocked: boolean;
      creator: {
        id: string;
        name: string;
        image?: string | null;
        phoneNumber: string | null;
        bio: string;
        city: string | null;
        gender?: "man" | "woman" | null;
        age?: number | null;
        niches: string[];
        languages: string[];
        platforms: string[];
        platformLinks?: Record<string, string> | null;
        tier: string;
        availabilityStatus: string;
        returnDate: string | null;
        ratingAvg: number;
        ratingCount: number;
        pricing?: Record<string, number> | null;
      };
      reviews: { id: string; stars: number; text: string; createdAt: string }[];
    }
  | { ok: false; code: string; message: string };

type VisitJson = { ok?: boolean; code?: string; message?: string; deducted?: number };

type MeJson = {
  ok?: boolean;
  user?: { id?: string; role?: string };
  wallet?: { balanceCoins?: number };
};

type OrderOptionsState = {
  baseUGCVideo: boolean;
  postInstagram: boolean;
  postTiktok: boolean;
  instagramStory: boolean;
  campaignPack: boolean;
};

const ORDER_LINE_META: ReadonlyArray<{
  key: keyof OrderOptionsState;
  label: string;
  coinField: string;
  required?: boolean;
}> = [
  { key: "baseUGCVideo", label: "UGC video (studio delivery)", coinField: "baseUGCVideoCoins", required: true },
  { key: "postInstagram", label: "Post on Instagram", coinField: "postInstagramCoins" },
  { key: "postTiktok", label: "Post on TikTok", coinField: "postTiktokCoins" },
  { key: "instagramStory", label: "Instagram story sequence", coinField: "instagramStoryCoins" },
  { key: "campaignPack", label: "Full campaign pack", coinField: "campaignPackCoins" },
];

export default function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: creatorUserId } = use(params);
  const token = useMemo(() => getToken(), []);
  const [state, setState] = useState<CreatorDetailsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deducted, setDeducted] = useState<number | null>(null);
  const [orderOptions, setOrderOptions] = useState<OrderOptionsState>({
    baseUGCVideo: true,
    postInstagram: false,
    postTiktok: false,
    instagramStory: false,
    campaignPack: false,
  });
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerCoins, setViewerCoins] = useState<number | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [studioTab, setStudioTab] = useState<
    "details" | "wallet" | "availability" | "orders" | "withdrawals" | "reviews"
  >("details");

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const meRes = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        const meJson = (await meRes.json()) as MeJson;
        const role = meJson?.ok && meJson.user?.role ? meJson.user.role : null;
        const meId = meJson?.ok && meJson.user?.id ? meJson.user.id : null;
        const coins =
          meJson?.ok && typeof meJson.wallet?.balanceCoins === "number"
            ? meJson.wallet.balanceCoins
            : null;
        if (!cancelled) {
          setViewerRole(role);
          setViewerId(meId);
          setViewerCoins(coins);
        }

        const visitRes = await fetch(`/api/creators/${creatorUserId}/visit`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const visitJson = (await visitRes.json()) as VisitJson;
        if (!visitRes.ok || !visitJson?.ok) {
          if (visitJson?.code === "LOW_BALANCE" || visitJson?.code === "WALLET_NOT_FUNDED") {
            setError("LOW_BALANCE");
            return;
          }
          setError(visitJson?.message ?? "Unable to unlock profile.");
          return;
        }
        setDeducted(visitJson.deducted ?? 0);
        if ((visitJson.deducted ?? 0) > 0 && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("wallet:refresh"));
        }

        const res = await fetch(`/api/creators/${creatorUserId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = (await res.json()) as CreatorDetailsResponse & { code?: string; message?: string };
        if (!res.ok || !json?.ok) {
          if (json?.code === "LOW_BALANCE" || json?.code === "WALLET_NOT_FUNDED") {
            setError("LOW_BALANCE");
            return;
          }
          if (!cancelled) setError(json?.message ?? "Unable to load creator.");
          return;
        }
        if (!cancelled) setState(json as CreatorDetailsResponse);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [creatorUserId, token, reloadNonce]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    async function refreshCoins() {
      try {
        const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        const json = (await res.json()) as MeJson;
        if (cancelled) return;
        if (json?.ok && typeof json.wallet?.balanceCoins === "number") {
          setViewerCoins(json.wallet.balanceCoins);
        }
      } catch {
        // ignore — keep last known balance
      }
    }

    function onWalletRefresh() {
      refreshCoins();
    }
    window.addEventListener("wallet:refresh", onWalletRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener("wallet:refresh", onWalletRefresh);
    };
  }, [token]);

  if (loading) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-16 text-sm text-stone-600 sm:px-6">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
        Loading creator studio…
      </div>
    );
  }

  if (error === "LOW_BALANCE") {
    return (
      <CreatorWalletCheckout
        token={token}
        onFunded={() => {
          setError(null);
          setState(null);
          setDeducted(null);
          setLoading(true);
          setReloadNonce((n) => n + 1);
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-6 text-sm text-rose-800">{error}</div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full border border-stone-900/12 px-5 text-sm font-medium text-stone-800"
          >
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (!state || !state.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-6 text-sm text-rose-800">
          {!state || !("message" in state) ? "Unable to load creator." : state.message}
        </div>
      </div>
    );
  }

  const c = state.creator;
  const pricing = c.pricing ?? null;
  const isOwnProfile = viewerRole === "creator" && viewerId === creatorUserId;
  const showOrderPanel = viewerRole === "client";
  const initialAvailability: "available" | "unavailable" =
    c.availabilityStatus === "unavailable" ? "unavailable" : "available";

  const editorInitial: CreatorEditorInitial = {
    name: c.name,
    image: c.image ?? null,
    phoneNumber: c.phoneNumber ?? "",
    gender: c.gender ?? "",
    age: c.age ?? null,
    city: c.city ?? "",
    bio: c.bio ?? "",
    niches: c.niches ?? [],
    languages: c.languages ?? [],
    platforms: c.platforms ?? [],
    platformLinks: {
      instagram: (c.platformLinks as Record<string, string> | null)?.instagram ?? "",
      tiktok: (c.platformLinks as Record<string, string> | null)?.tiktok ?? "",
      youtube: (c.platformLinks as Record<string, string> | null)?.youtube ?? "",
    },
    pricing: {
      baseUGCVideoCoins: typeof pricing?.baseUGCVideoCoins === "number" ? pricing.baseUGCVideoCoins : 0,
      postInstagramCoins: typeof pricing?.postInstagramCoins === "number" ? pricing.postInstagramCoins : 0,
      postTiktokCoins: typeof pricing?.postTiktokCoins === "number" ? pricing.postTiktokCoins : 0,
      instagramStoryCoins: typeof pricing?.instagramStoryCoins === "number" ? pricing.instagramStoryCoins : 0,
      campaignPackCoins: typeof pricing?.campaignPackCoins === "number" ? pricing.campaignPackCoins : 0,
    },
  };

  const coinFor = (field: string) => {
    if (!pricing) return 0;
    const v = pricing[field];
    return typeof v === "number" ? v : 0;
  };

  const selectedKeys = (Object.keys(orderOptions) as (keyof OrderOptionsState)[]).filter((k) => orderOptions[k]);

  const totalCoins = ORDER_LINE_META.filter((line) => orderOptions[line.key]).reduce(
    (sum, line) => sum + coinFor(line.coinField),
    0
  );

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="overflow-hidden rounded-3xl border border-stone-900/10 bg-surface-elevated shadow-lg shadow-stone-900/5">
        <div className="border-b border-stone-900/10 bg-gradient-to-r from-secondary/80 to-surface-elevated px-6 py-8 sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-5">
              <UserAvatar
                name={c.name}
                image={c.image}
                initialsTextClassName="text-xl"
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary/35 to-accent-warm/25 ring-1 ring-stone-900/10"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{c.name}</h1>
                  <span className="rounded-full bg-primary/20 px-3 py-0.5 text-xs font-semibold uppercase tracking-wide text-stone-900">
                    {c.tier}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-600">
                  {c.city ?? "Tunisia"} · {c.niches?.[0] ?? "UGC"} ·{" "}
                  <span className="font-medium text-stone-800">
                    ★ {c.ratingAvg} <span className="text-stone-500">({c.ratingCount} reviews)</span>
                  </span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-stone-600">
                  {(c.languages ?? []).map((lang) => (
                    <span key={lang} className="rounded-full border border-stone-900/10 bg-white/80 px-2 py-0.5">
                      {lang}
                    </span>
                  ))}
                  {(c.platforms ?? []).map((p) => (
                    <span key={p} className="rounded-full border border-stone-900/10 bg-white/80 px-2 py-0.5">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs rounded-2xl border border-stone-900/10 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Direct line</p>
              <div className="mt-2 text-lg font-semibold text-stone-900">
                {c.phoneNumber ? (
                  <a className="hover:text-primary" href={`tel:${c.phoneNumber}`}>
                    {c.phoneNumber}
                  </a>
                ) : (
                  <span className="text-stone-500">Not shared</span>
                )}
              </div>
              {showOrderPanel && deducted !== null ? (
                <p className="mt-3 text-xs text-stone-500">
                  First visit debit: <span className="font-semibold text-stone-800">{deducted}</span> coin
                  {deducted === 1 ? "" : "s"} (idempotent if you refresh).
                </p>
              ) : null}
              {isOwnProfile && token ? (
                <button
                  type="button"
                  onClick={() => {
                    setStudioTab("details");
                    if (typeof window !== "undefined") {
                      requestAnimationFrame(() => {
                        document.getElementById("creator-profile-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      });
                    }
                  }}
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full border border-stone-900/12 bg-secondary/70 px-4 text-xs font-semibold text-stone-800 transition hover:border-primary/40"
                >
                  Edit profile
                </button>
              ) : null}
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-sm leading-relaxed text-stone-700">{c.bio}</p>
        </div>

        <div className={showOrderPanel ? "grid gap-0 lg:grid-cols-[1fr_360px]" : "grid gap-0"}>
          <div className="space-y-8 p-6 sm:p-10">
            {isOwnProfile && token ? (
              <StudioTabs current={studioTab} onChange={setStudioTab} />
            ) : null}

            {(!isOwnProfile || studioTab === "details") ? (
              <>
                {isOwnProfile && token ? (
                  <section id="creator-profile-editor" className="scroll-mt-24">
                    <div className="mb-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Edit profile</p>
                      <p className="mt-1 text-sm text-stone-600">
                        Update what brands see in discovery and on this profile page.
                      </p>
                    </div>
                    <CreatorProfileEditor
                      token={token}
                      initial={editorInitial}
                      onSaved={() => setReloadNonce((n) => n + 1)}
                    />
                  </section>
                ) : null}

                <section>
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Focus niches</h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(c.niches ?? []).length ? (
                      (c.niches ?? []).map((n) => (
                        <span key={n} className="rounded-full border border-stone-900/10 bg-secondary/60 px-3 py-1 text-sm font-medium text-stone-800">
                          {n}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-stone-500">No niches selected yet.</span>
                    )}
                  </div>
                  <p className="mt-4 text-sm text-stone-600">
                    Availability:{" "}
                    <span className="font-semibold capitalize text-stone-900">{c.availabilityStatus}</span>
                    {c.returnDate ? (
                      <>
                        {" "}
                        · Expected back <span className="font-medium">{new Date(c.returnDate).toLocaleDateString()}</span>
                      </>
                    ) : null}
                  </p>
                </section>

                <ProfileDetails creator={c} />

                <RateCard pricing={pricing} />

                <PlatformLinks
                  links={(c.platformLinks ?? null) as Record<string, string> | null}
                  platforms={c.platforms ?? []}
                />

                {!isOwnProfile ? (
                  <ReviewsSection reviews={state.reviews} isOwnProfile={isOwnProfile} />
                ) : null}
              </>
            ) : null}

            {isOwnProfile && studioTab === "reviews" ? (
              <ReviewsSection reviews={state.reviews} isOwnProfile={isOwnProfile} />
            ) : null}

            {isOwnProfile && token && studioTab === "wallet" ? (
              <CreatorStudioPanel
                key="wallet"
                token={token}
                initialAvailabilityStatus={initialAvailability}
                initialReturnDate={c.returnDate ?? null}
                view="wallet"
              />
            ) : null}

            {isOwnProfile && token && studioTab === "availability" ? (
              <CreatorStudioPanel
                key="availability"
                token={token}
                initialAvailabilityStatus={initialAvailability}
                initialReturnDate={c.returnDate ?? null}
                view="availability"
              />
            ) : null}

            {isOwnProfile && token && studioTab === "orders" ? (
              <CreatorStudioPanel
                key="orders"
                token={token}
                initialAvailabilityStatus={initialAvailability}
                initialReturnDate={c.returnDate ?? null}
                view="orders"
              />
            ) : null}

            {isOwnProfile && token && studioTab === "withdrawals" ? (
              <CreatorStudioPanel
                key="withdrawals"
                token={token}
                initialAvailabilityStatus={initialAvailability}
                initialReturnDate={c.returnDate ?? null}
                view="withdrawals"
              />
            ) : null}
          </div>

          {showOrderPanel ? (
            <aside className="border-t border-stone-900/10 bg-secondary/30 p-6 sm:p-8 lg:border-l lg:border-t-0">
              <h2 className="text-lg font-semibold text-stone-900">Build your order</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                Toggle deliverables to match your brief. Totals mirror the creator&apos;s published rate card.
              </p>

              <div className="mt-5 space-y-2">
                {ORDER_LINE_META.map((o) => (
                  <label
                    key={o.key}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-stone-900/10 bg-surface-elevated px-3 py-2.5 text-sm shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={orderOptions[o.key]}
                        disabled={o.required}
                        onChange={(e) => setOrderOptions((prev) => ({ ...prev, [o.key]: e.target.checked }))}
                      />
                      <span className="font-medium text-stone-900">{o.label}</span>
                    </span>
                    <span className="tabular-nums text-xs font-semibold text-stone-600">{coinFor(o.coinField)} coins</span>
                  </label>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-stone-900/10 bg-surface-elevated p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600">Estimated total</span>
                  <span className="text-lg font-semibold tabular-nums text-stone-900">{totalCoins} coins</span>
                </div>
                <p className="mt-1 text-xs text-stone-500 tabular-nums">≈ {coinsToDt(totalCoins)} DT at published conversion</p>
              </div>

              {orderStatus ? (
                <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900">
                  {orderStatus}
                </div>
              ) : null}

              {viewerCoins !== null ? (
                <div
                  className={
                    "mt-4 flex items-center justify-between rounded-2xl border px-3 py-2 text-xs " +
                    (viewerCoins < totalCoins
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-900"
                      : "border-stone-900/10 bg-surface-elevated text-stone-700")
                  }
                >
                  <span>
                    Wallet balance:{" "}
                    <span className="font-semibold tabular-nums">{viewerCoins}</span> coins
                  </span>
                  {viewerCoins < totalCoins ? (
                    <span className="font-semibold">
                      Need {totalCoins - viewerCoins} more
                    </span>
                  ) : null}
                </div>
              ) : null}

              {viewerCoins !== null && viewerCoins < totalCoins ? (
                <Link
                  href="/dashboard/client?tab=wallet"
                  className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-stone-900 shadow-md shadow-primary/25 ring-1 ring-stone-900/10 transition hover:brightness-105"
                >
                  Top up wallet with DT
                </Link>
              ) : null}

              <button
                type="button"
                disabled={viewerCoins === null || viewerCoins < totalCoins || totalCoins <= 0}
                className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-stone-900 text-sm font-semibold text-white shadow-md transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={async () => {
                  setOrderStatus(null);
                  const res = await fetch("/api/orders", {
                    method: "POST",
                    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
                    body: JSON.stringify({ creatorUserId, options: selectedKeys }),
                  });
                  const json = await res.json();
                  if (!res.ok || !json?.ok) {
                    if (json?.code === "LOW_BALANCE") {
                      setOrderStatus(json?.message ?? "Insufficient coins. Top up first.");
                      window.location.href = "/dashboard/client?tab=wallet";
                      return;
                    }
                    setOrderStatus(json?.message ?? "Failed to create order.");
                    return;
                  }
                  setOrderStatus(`Order sent — total ${json.order.totalCoins} coins.`);
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("wallet:refresh"));
                  }
                }}
              >
                {viewerCoins !== null && viewerCoins < totalCoins
                  ? "Insufficient coins"
                  : "Send order to creator"}
              </button>
            </aside>
          ) : null}
        </div>
      </div>

    </div>
  );
}

type StudioTabId = "details" | "wallet" | "availability" | "orders" | "withdrawals" | "reviews";

const STUDIO_TABS: ReadonlyArray<{ id: StudioTabId; label: string }> = [
  { id: "details", label: "Profile details" },
  { id: "wallet", label: "Wallet" },
  { id: "availability", label: "Availability" },
  { id: "orders", label: "Orders" },
  { id: "withdrawals", label: "Withdrawal history" },
  { id: "reviews", label: "Reviews" },
];

function StudioTabs({
  current,
  onChange,
}: {
  current: StudioTabId;
  onChange: (id: StudioTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Creator studio sections"
      className="-mx-1 flex gap-1 overflow-x-auto rounded-2xl border border-stone-900/10 bg-secondary/40 p-1"
    >
      {STUDIO_TABS.map((t) => {
        const active = t.id === current;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={
              "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition " +
              (active
                ? "bg-stone-900 text-white shadow-sm"
                : "text-stone-700 hover:bg-stone-900/5")
            }
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

const RATE_CARD_LINES: ReadonlyArray<{ key: string; label: string }> = [
  { key: "baseUGCVideoCoins", label: "UGC video (studio delivery)" },
  { key: "postInstagramCoins", label: "Post on Instagram" },
  { key: "postTiktokCoins", label: "Post on TikTok" },
  { key: "instagramStoryCoins", label: "Instagram story sequence" },
  { key: "campaignPackCoins", label: "Full campaign pack" },
];

function ProfileDetails({
  creator,
}: {
  creator: {
    name: string;
    phoneNumber: string | null;
    bio: string;
    city: string | null;
    gender?: "man" | "woman" | null;
    age?: number | null;
    languages: string[];
    platforms: string[];
    tier: string;
    availabilityStatus: string;
    returnDate: string | null;
  };
}) {
  const rows: { label: string; value: string }[] = [
    { label: "Display name", value: creator.name },
    { label: "City", value: creator.city || "—" },
    { label: "Gender", value: creator.gender ? (creator.gender === "man" ? "Man" : "Woman") : "Not set" },
    { label: "Age", value: creator.age != null ? String(creator.age) : "Not set" },
    {
      label: "Languages",
      value: creator.languages?.length ? creator.languages.join(", ") : "Not set",
    },
    {
      label: "Platforms",
      value: creator.platforms?.length ? creator.platforms.join(", ") : "Not set",
    },
    { label: "Phone", value: creator.phoneNumber || "Hidden" },
    { label: "Tier", value: creator.tier },
    {
      label: "Availability",
      value:
        creator.availabilityStatus +
        (creator.returnDate
          ? ` · back ${new Date(creator.returnDate).toLocaleDateString()}`
          : ""),
    },
  ];

  return (
    <section className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Profile details</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-4 border-b border-stone-900/5 pb-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{r.label}</dt>
            <dd className="text-right text-sm font-medium text-stone-900">{r.value}</dd>
          </div>
        ))}
      </dl>
      {creator.bio ? (
        <div className="mt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">About</p>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">{creator.bio}</p>
        </div>
      ) : null}
    </section>
  );
}

function RateCard({ pricing }: { pricing: Record<string, number> | null }) {
  const lines = RATE_CARD_LINES.map((l) => ({
    label: l.label,
    coins: typeof pricing?.[l.key] === "number" ? (pricing[l.key] as number) : 0,
  }));
  const hasAny = lines.some((l) => l.coins > 0);

  return (
    <section className="rounded-2xl border border-stone-900/10 bg-secondary/30 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Rate card</h2>
          <p className="mt-1 text-xs text-stone-500">Prices in coins (10 coins = 1 DT). 0 means not offered.</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-stone-900/5">
        {lines.map((l) => (
          <li key={l.label} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="text-stone-800">{l.label}</span>
            <span
              className={
                l.coins > 0
                  ? "tabular-nums font-semibold text-stone-900"
                  : "tabular-nums text-stone-400"
              }
            >
              {l.coins > 0 ? `${l.coins} coins · ${coinsToDt(l.coins)} DT` : "—"}
            </span>
          </li>
        ))}
      </ul>
      {!hasAny ? (
        <p className="mt-3 text-xs text-stone-500">No prices set yet — buyers will not see a rate card.</p>
      ) : null}
    </section>
  );
}

function ReviewsSection({
  reviews,
  isOwnProfile,
}: {
  reviews: { id: string; stars: number; text: string; createdAt: string }[];
  isOwnProfile: boolean;
}) {
  return (
    <section className="rounded-2xl border border-stone-900/10 bg-secondary/40 p-6">
      <h2 className="text-lg font-semibold text-stone-900">{isOwnProfile ? "Your reviews" : "Reviews"}</h2>
      <div className="mt-4 space-y-4">
        {reviews.length ? (
          reviews.map((r) => (
            <figure key={r.id} className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-4">
              <div className="text-sm font-semibold text-stone-900">★ {r.stars}</div>
              {r.text ? (
                <blockquote className="mt-2 text-sm leading-relaxed text-stone-600">&ldquo;{r.text}&rdquo;</blockquote>
              ) : null}
              <figcaption className="mt-2 text-xs text-stone-500">
                {new Date(r.createdAt).toLocaleDateString()}
              </figcaption>
            </figure>
          ))
        ) : (
          <p className="text-sm text-stone-600">
            {isOwnProfile
              ? "No reviews yet — they appear here after clients mark completed orders."
              : "No public reviews yet — be the first completed order."}
          </p>
        )}
      </div>
    </section>
  );
}

function PlatformLinks({
  links,
  platforms,
}: {
  links: Record<string, string> | null;
  platforms: string[];
}) {
  const entries = [
    { key: "instagram", label: "Instagram", url: links?.instagram ?? "" },
    { key: "tiktok", label: "TikTok", url: links?.tiktok ?? "" },
    { key: "youtube", label: "YouTube", url: links?.youtube ?? "" },
  ];
  const hasAny = entries.some((e) => e.url);

  if (!hasAny && !platforms.length) return null;

  return (
    <section className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Platform links</h2>
      <ul className="mt-4 space-y-2">
        {entries.map((e) => (
          <li key={e.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium text-stone-800">{e.label}</span>
            {e.url ? (
              <a
                href={e.url}
                target="_blank"
                rel="noreferrer"
                className="max-w-[60%] truncate text-right text-primary hover:underline"
                title={e.url}
              >
                {e.url.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="text-stone-400">Not linked</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
