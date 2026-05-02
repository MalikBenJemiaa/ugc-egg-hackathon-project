"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/token-storage";

type Withdrawal = {
  id: string;
  creatorUserId: string;
  coins: number;
  grossDT: number;
  commissionDT: number;
  netDT: number;
  status: string;
  createdAt: string;
};

export default function AdminWithdrawals() {
  const token = useMemo(() => getToken(), []);
  const [items, setItems] = useState<Withdrawal[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/withdrawals", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json?.ok) setItems(json.withdrawals);
    else setMsg(json?.message ?? "Failed to load withdrawals.");
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/auth/login";
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const act = async (withdrawalId: string, action: "process" | "reject") => {
    setMsg(null);
    const res = await fetch("/api/admin/withdrawals", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ withdrawalId, action }),
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
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Finance</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-stone-900">Withdrawals</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Validate bank details offline, then mark payouts as processed or reject with a note to the creator.
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
          items.map((w) => (
            <div
              key={w.id}
              className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm transition hover:border-primary/25"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="font-semibold tabular-nums text-stone-900">
                    {w.coins} coins → {w.netDT} DT net
                  </div>
                  <div className="mt-1 text-xs text-stone-500">
                    Gross {w.grossDT} DT · Commission {w.commissionDT} DT · Creator ID{" "}
                    <span className="font-mono text-stone-700">{w.creatorUserId}</span>
                  </div>
                  <div className="mt-1 text-xs text-stone-400">{new Date(w.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => act(w.id, "process")}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                  >
                    Mark processed
                  </button>
                  <button
                    type="button"
                    onClick={() => act(w.id, "reject")}
                    className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-stone-600">No pending withdrawals — queue is clear.</p>
        )}
      </div>
    </div>
  );
}

