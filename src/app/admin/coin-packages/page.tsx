"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/token-storage";

type Pkg = {
  id: string;
  name: string;
  dtPrice: number;
  coinsReceived: number;
  bonusCoins: number;
  active: boolean;
};

export default function AdminCoinPackages() {
  const token = useMemo(() => getToken(), []);
  const [items, setItems] = useState<Pkg[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/coin-packages", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json?.ok) setItems(json.packages);
    else setMsg(json?.message ?? "Failed to load packages.");
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const toggle = async (p: Pkg) => {
    setMsg(null);
    const res = await fetch("/api/admin/coin-packages", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ...p, active: !p.active }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) {
      setMsg(json?.message ?? "Update failed.");
      return;
    }
    await load();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Monetization</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Coin packages</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Toggle seasonal bundles (Ramadan pushes, Black Friday, etc.) without redeploying the client apps.
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
        {items.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm transition hover:border-primary/25"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-semibold tracking-tight text-stone-900">{p.name}</div>
                <div className="mt-1 text-xs text-stone-500 tabular-nums">
                  {p.dtPrice} DT → {p.coinsReceived} coins (+{p.bonusCoins} bonus)
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(p)}
                className={`rounded-full px-4 py-2 text-xs font-semibold shadow-sm ${
                  p.active ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-stone-200 text-stone-900 hover:bg-stone-300"
                }`}
              >
                {p.active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>
        ))}
        {!items.length ? <p className="text-sm text-stone-600">No packages found.</p> : null}
      </div>
    </div>
  );
}

