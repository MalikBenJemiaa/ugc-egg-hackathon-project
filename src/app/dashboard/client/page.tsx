"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreatorWalletCheckout } from "@/components/CreatorWalletCheckout";
import { UserAvatar } from "@/components/UserAvatar";
import { coinsToDt } from "@/lib/coins";
import { getToken } from "@/lib/token-storage";

type ClientProfile = {
  id: string;
  email: string;
  role: string;
  image: string | null;
  name: string;
  phoneNumber: string;
  companyName: string;
  city: string;
  bio: string;
  createdAt: string;
};

type MeResponse =
  | {
      ok: true;
      user: ClientProfile;
      wallet: { balanceCoins: number };
    }
  | { ok: false; code: string; message: string };

type ProfilePostResponse =
  | { ok: true; user: Omit<ClientProfile, "image" | "createdAt"> }
  | { ok: false; code: string; message: string };

type OrderItem = { key: string; label: string; coins: number };
type OrderParty = { id: string; name: string | null; image: string | null };
type OrderRow = {
  id: string;
  clientUserId: string;
  creatorUserId: string;
  items: OrderItem[];
  totalCoins: number;
  status: string;
  createdAt: string;
  creator?: OrderParty;
  client?: OrderParty;
};
type OrdersResponse =
  | { ok: true; orders: OrderRow[] }
  | { ok: false; code: string; message: string };

type ReviewRow = {
  id: string;
  stars: number;
  text: string;
  createdAt: string;
  creatorUserId: string;
  creatorName: string | null;
  creatorImage: string | null;
  orderId: string;
};
type ReviewsResponse =
  | { ok: true; reviews: ReviewRow[] }
  | { ok: false; code: string; message: string };

type TabId = "profile" | "wallet" | "orders" | "reviews" | "comments";

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "profile", label: "Profile" },
  { id: "wallet", label: "Top up wallet" },
  { id: "orders", label: "Orders history" },
  { id: "reviews", label: "Reviews history" },
  { id: "comments", label: "Comments history" },
];

function deriveDisplayName(name: string, email: string) {
  if (name.trim()) return name.trim();
  const i = email.indexOf("@");
  return i > 0 ? email.slice(0, i) : email;
}

function isTabId(value: string | null): value is TabId {
  return (
    value === "profile" ||
    value === "wallet" ||
    value === "orders" ||
    value === "reviews" ||
    value === "comments"
  );
}

export default function ClientDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-16 text-sm text-stone-600 sm:px-6">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
          Loading your profile…
        </div>
      }
    >
      <ClientDashboardInner />
    </Suspense>
  );
}

function ClientDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const token = useMemo(() => getToken(), []);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [coins, setCoins] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [tab, setTab] = useState<TabId>(isTabId(tabParam) ? tabParam : "profile");

  useEffect(() => {
    if (isTabId(tabParam) && tabParam !== tab) setTab(tabParam);
  }, [tabParam, tab]);

  function changeTab(next: TabId) {
    setTab(next);
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (next === "profile") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/client?${qs}` : "/dashboard/client", { scroll: false });
  }

  async function refreshMe() {
    if (!token) return;
    try {
      const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json()) as MeResponse;
      if (!data.ok) {
        setLoadError(data.message ?? "Failed to load profile.");
        return;
      }
      if (data.user.role === "creator") {
        window.location.replace(`/creators/${encodeURIComponent(data.user.id)}`);
        return;
      }
      if (data.user.role === "admin") {
        window.location.replace("/admin");
        return;
      }
      setProfile(data.user);
      setCoins(data.wallet.balanceCoins);
    } catch {
      setLoadError("Failed to load profile.");
    }
  }

  useEffect(() => {
    if (!token) {
      window.location.replace("/auth/login");
      return;
    }
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    function onWalletRefresh() {
      refreshMe();
    }
    window.addEventListener("wallet:refresh", onWalletRefresh);
    return () => window.removeEventListener("wallet:refresh", onWalletRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 sm:px-6">
        <div className="rounded-3xl border border-rose-500/25 bg-rose-500/10 p-6 text-sm text-rose-800">
          {loadError}
        </div>
        <div className="mt-6">
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

  if (!profile) {
    return (
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-16 text-sm text-stone-600 sm:px-6">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
        Loading your profile…
      </div>
    );
  }

  const displayName = deriveDisplayName(profile.name, profile.email);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="overflow-hidden rounded-3xl border border-stone-900/10 bg-surface-elevated shadow-lg shadow-stone-900/5">
        <div className="border-b border-stone-900/10 bg-gradient-to-r from-secondary/80 to-surface-elevated px-6 py-8 sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-5">
              <UserAvatar
                name={displayName}
                image={profile.image}
                initialsTextClassName="text-xl"
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary/35 to-accent-warm/25 ring-1 ring-stone-900/10"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">My profile</p>
                <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight capitalize text-stone-900">
                  {displayName}
                </h1>
                <p className="mt-1 truncate text-sm text-stone-600">{profile.email}</p>
                {profile.companyName ? (
                  <p className="mt-2 inline-flex rounded-full border border-stone-900/10 bg-white/80 px-3 py-0.5 text-xs font-medium text-stone-800">
                    {profile.companyName}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <div className="rounded-2xl border border-primary/25 bg-primary-muted/40 px-4 py-2 text-sm text-stone-800">
                Wallet:{" "}
                <span className="font-semibold tabular-nums text-stone-900">
                  {coins ?? "…"}
                </span>{" "}
                coins
              </div>
              <Link
                href="/creators"
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-stone-900 shadow-md shadow-primary/20 ring-1 ring-stone-900/10 transition hover:brightness-105"
              >
                Browse creators
              </Link>
            </div>
          </div>
        </div>

        <div className="border-b border-stone-900/10 bg-secondary/20 px-3 py-2 sm:px-6">
          <div
            role="tablist"
            aria-label="Profile sections"
            className="-mx-1 flex gap-1 overflow-x-auto p-1"
          >
            {TABS.map((t) => {
              const active = t.id === tab;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => changeTab(t.id)}
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
        </div>

        <div className="p-6 sm:p-10">
          {tab === "profile" ? (
            <ProfileTab profile={profile} token={token} onSaved={refreshMe} />
          ) : null}
          {tab === "wallet" ? <WalletTab token={token} /> : null}
          {tab === "orders" ? <OrdersTab token={token} /> : null}
          {tab === "reviews" ? <ReviewsTab token={token} /> : null}
          {tab === "comments" ? <CommentsTab /> : null}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({
  profile,
  token,
  onSaved,
}: {
  profile: ClientProfile;
  token: string | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [phoneNumber, setPhoneNumber] = useState(profile.phoneNumber);
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [city, setCity] = useState(profile.city);
  const [bio, setBio] = useState(profile.bio);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const displayName = deriveDisplayName(profile.name, profile.email);

  async function handleImagePick(file: File) {
    if (!token) return;
    setErr(null);
    setMsg(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setErr(json?.message ?? "Upload failed.");
        return;
      }
      setMsg("Profile picture updated.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("wallet:refresh"));
      }
      onSaved();
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!token) return;
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/me/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phoneNumber: phoneNumber.trim(),
          companyName: companyName.trim(),
          city: city.trim(),
          bio: bio.trim(),
        }),
      });
      const json = (await res.json()) as ProfilePostResponse;
      if (!res.ok || !json.ok) {
        setErr(("message" in json && json.message) || "Save failed.");
        return;
      }
      setMsg("Profile saved.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("wallet:refresh"));
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  const detailRows: { label: string; value: string }[] = [
    { label: "Display name", value: profile.name || "Not set" },
    { label: "Email", value: profile.email },
    { label: "Phone", value: profile.phoneNumber || "Not set" },
    { label: "Company / brand", value: profile.companyName || "Not set" },
    { label: "City", value: profile.city || "Not set" },
    { label: "Member since", value: new Date(profile.createdAt).toLocaleDateString() },
  ];

  return (
    <div className="space-y-8">
      {msg ? (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}
      {err ? (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-800">
          {err}
        </div>
      ) : null}

      <section className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Profile details</h2>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {detailRows.map((r) => (
            <div
              key={r.label}
              className="flex items-baseline justify-between gap-4 border-b border-stone-900/5 pb-2"
            >
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-500">{r.label}</dt>
              <dd className="text-right text-sm font-medium text-stone-900">{r.value}</dd>
            </div>
          ))}
        </dl>
        {profile.bio ? (
          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-500">About</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">{profile.bio}</p>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-stone-900/10 bg-secondary/30 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Edit profile</h2>
        <p className="mt-1 text-xs text-stone-500">
          Update your contact details and brand info. Creators see this when they receive your orders.
        </p>

        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
          <UserAvatar
            name={displayName}
            image={profile.image}
            initialsTextClassName="text-lg"
            className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-accent-warm/20 ring-1 ring-stone-900/10"
          />
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImagePick(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-10 items-center justify-center rounded-full bg-stone-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-60"
            >
              {uploading ? "Uploading…" : profile.image ? "Change photo" : "Upload photo"}
            </button>
            <p className="text-xs text-stone-500">PNG, JPG, WEBP or GIF — up to 5MB.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Display name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="h-10 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 text-sm text-stone-900 outline-none transition focus:border-primary"
            />
          </Field>
          <Field label="Phone number">
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+216 ..."
              className="h-10 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 text-sm text-stone-900 outline-none transition focus:border-primary"
            />
          </Field>
          <Field label="Company / brand">
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Brand or company name"
              className="h-10 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 text-sm text-stone-900 outline-none transition focus:border-primary"
            />
          </Field>
          <Field label="City">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Tunis, Sfax, Sousse…"
              className="h-10 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 text-sm text-stone-900 outline-none transition focus:border-primary"
            />
          </Field>
          <Field label="About" wide>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Tell creators about your brand and what kind of content you usually order."
              className="w-full resize-y rounded-xl border border-stone-900/12 bg-surface-elevated p-3 text-sm text-stone-900 outline-none transition focus:border-primary"
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/20 ring-1 ring-stone-900/10 transition hover:brightness-105 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              setName(profile.name);
              setPhoneNumber(profile.phoneNumber);
              setCompanyName(profile.companyName);
              setCity(profile.city);
              setBio(profile.bio);
              setMsg(null);
              setErr(null);
            }}
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-full border border-stone-900/12 bg-surface-elevated px-6 text-sm font-medium text-stone-800 transition hover:bg-secondary disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </section>
    </div>
  );
}

function WalletTab({ token }: { token: string | null }) {
  return (
    <section className="rounded-2xl border border-stone-900/10 bg-secondary/20 p-2 sm:p-4">
      <CreatorWalletCheckout
        token={token}
        bare
        eyebrow="Wallet checkout · Tunisia"
        title="Add coins to your wallet"
        description={
          <>
            Pick a coin pack and pay in Tunisian dinar through Konnect or Paymee. Coins are credited to your
            wallet right after the provider confirms.
          </>
        }
        successCtaLabel="Done"
        hideBackLink
        onFunded={() => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("wallet:refresh"));
          }
        }}
      />
    </section>
  );
}

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: "bg-amber-500/15 text-amber-900 border-amber-500/30",
  ACCEPTED: "bg-sky-500/15 text-sky-900 border-sky-500/30",
  IN_PROGRESS: "bg-violet-500/15 text-violet-900 border-violet-500/30",
  DELIVERED: "bg-emerald-500/15 text-emerald-900 border-emerald-500/30",
  COMPLETED: "bg-emerald-600/20 text-emerald-950 border-emerald-600/35",
  CANCELLED: "bg-stone-500/15 text-stone-700 border-stone-500/30",
};

function OrdersTab({ token }: { token: string | null }) {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
        const data = (await res.json()) as OrdersResponse;
        if (cancelled) return;
        if (data.ok) setOrders(data.orders);
        else setError(data.message ?? "Failed to load orders.");
      } catch {
        if (!cancelled) setError("Failed to load orders.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  if (orders == null) {
    return (
      <div className="flex items-center gap-3 text-sm text-stone-600">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
        Loading orders…
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-900/15 bg-surface-elevated/60 p-10 text-center text-stone-600">
        No orders yet — find a creator and send your first brief.
        <div className="mt-4">
          <Link
            href="/creators"
            className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-stone-900 shadow-md shadow-primary/20 ring-1 ring-stone-900/10"
          >
            Browse creators
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Orders history</h2>
      <ul className="space-y-3">
        {orders.map((o) => {
          const statusClass = STATUS_STYLES[o.status] ?? "bg-stone-200 text-stone-800 border-stone-300";
          const creatorId = o.creator?.id ?? o.creatorUserId;
          const creatorName = o.creator?.name ?? "Creator";
          const creatorImage = o.creator?.image ?? null;
          return (
            <li
              key={o.id}
              className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm transition hover:border-primary/25"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link
                  href={`/creators/${creatorId}`}
                  className="group flex min-w-0 items-center gap-3"
                >
                  <UserAvatar
                    name={creatorName}
                    image={creatorImage}
                    initialsTextClassName="text-sm"
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 to-accent-warm/20 ring-1 ring-stone-900/10"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold capitalize text-stone-900 group-hover:text-primary">
                      {creatorName}
                    </p>
                    <p className="text-xs text-stone-500">
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                </Link>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClass}`}
                >
                  {o.status.replace(/_/g, " ")}
                </span>
              </div>

              <ul className="mt-3 space-y-1">
                {o.items.map((it) => (
                  <li
                    key={it.key}
                    className="flex items-center justify-between gap-3 text-sm text-stone-700"
                  >
                    <span>{it.label}</span>
                    <span className="tabular-nums text-stone-500">{it.coins} coins</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-stone-900/5 pt-3 text-sm">
                <span className="text-stone-500">Total</span>
                <span className="tabular-nums font-semibold text-stone-900">
                  {o.totalCoins} coins · {coinsToDt(o.totalCoins)} DT
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ReviewsTab({ token }: { token: string | null }) {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/reviews", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as ReviewsResponse;
        if (cancelled) return;
        if (data.ok) setReviews(data.reviews);
        else setError(data.message ?? "Failed to load reviews.");
      } catch {
        if (!cancelled) setError("Failed to load reviews.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-800">
        {error}
      </div>
    );
  }

  if (reviews == null) {
    return (
      <div className="flex items-center gap-3 text-sm text-stone-600">
        <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
        Loading reviews…
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-stone-900/15 bg-surface-elevated/60 p-10 text-center text-stone-600">
        No reviews yet — once an order is completed you can rate the creator.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Reviews you wrote</h2>
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li
            key={r.id}
            className="flex gap-4 rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm transition hover:border-primary/25"
          >
            <UserAvatar
              name={r.creatorName ?? "Creator"}
              image={r.creatorImage}
              initialsTextClassName="text-sm"
              className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/25 to-accent-warm/20 ring-1 ring-stone-900/10"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/creators/${r.creatorUserId}`}
                  className="truncate text-sm font-semibold text-stone-900 hover:text-primary"
                >
                  {r.creatorName ?? "Creator"}
                </Link>
                <p className="text-xs text-stone-500">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-stone-900">★ {r.stars}</p>
              {r.text ? (
                <blockquote className="mt-2 text-sm leading-relaxed text-stone-700">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
              ) : (
                <p className="mt-2 text-sm italic text-stone-500">No written feedback.</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommentsTab() {
  return (
    <div className="rounded-2xl border border-dashed border-stone-900/15 bg-surface-elevated/60 p-10 text-center text-stone-600">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Comments history</h2>
      <p className="mt-3 text-sm">
        Public comments aren&apos;t enabled yet. Once they go live, every comment you leave on a creator
        profile will show up here.
      </p>
    </div>
  );
}

function Field({
  label,
  wide,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</span>
      {children}
    </label>
  );
}
