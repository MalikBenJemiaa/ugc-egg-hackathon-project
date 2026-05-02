"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/token-storage";

type CreatorItem = {
  userId: string;
  name: string;
  tier: string;
  verifiedStatus: string;
  availabilityStatus: string;
  createdAt: string;
};

export default function AdminCreators() {
  const token = useMemo(() => getToken(), []);
  const [items, setItems] = useState<CreatorItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/creators/verify", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json?.ok) setItems(json.creators);
    else setMsg(json?.message ?? "Failed to load creators.");
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const act = async (creatorUserId: string, action: "approve" | "request_changes" | "reject") => {
    setMsg(null);
    const res = await fetch("/api/admin/creators/verify", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ creatorUserId, action }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) {
      setMsg(json?.message ?? "Action failed.");
      return;
    }
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Trust</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Creator verification</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Approve polished portfolios, request fixes on pricing or media, or reject duplicates and policy violations.
          </p>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-stone-800 underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          ← Admin home
        </Link>
      </div>

      {msg ? (
        <div className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-800">{msg}</div>
      ) : null}

      <div className="mt-8 space-y-3">
        {items.length ? (
          items.map((c) => (
            <div
              key={c.userId}
              className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm transition hover:border-primary/25"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold tracking-tight text-stone-900">{c.name}</div>
                  <div className="mt-1 text-sm text-stone-600">
                    Verification <span className="font-medium capitalize">{c.verifiedStatus}</span> · Availability{" "}
                    <span className="font-medium capitalize">{c.availabilityStatus}</span> · Tier{" "}
                    <span className="font-medium">{c.tier}</span>
                  </div>
                  <div className="mt-1 text-xs text-stone-400">Submitted {new Date(c.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => act(c.userId, "approve")}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => act(c.userId, "request_changes")}
                    className="rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-400"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    onClick={() => act(c.userId, "reject")}
                    className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-600">No creators pending verification.</p>
        )}
      </div>
    </div>
  );
}

