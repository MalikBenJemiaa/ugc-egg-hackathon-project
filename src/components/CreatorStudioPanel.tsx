"use client";

import { useCallback, useEffect, useState } from "react";
import { coinsToDt, withdrawalNetDtFromCoins } from "@/lib/coins";
import { UserAvatar } from "@/components/UserAvatar";

type WithdrawalItem = {
  id: string;
  coins: number;
  grossDT: number;
  commissionDT: number;
  netDT: number;
  status: string;
  createdAt: string;
};

type OrderItem = {
  id: string;
  clientUserId: string;
  creatorUserId: string;
  items: { key: string; label: string; coins: number }[];
  totalCoins: number;
  status: string;
  createdAt: string;
  client?: {
    id: string;
    name: string | null;
    image: string | null;
  };
  review?: {
    id: string | null;
    stars: number;
    text: string;
    createdAt: string | null;
  } | null;
};

export type CreatorStudioView = "wallet" | "availability" | "orders" | "withdrawals";

type Props = {
  token: string;
  initialAvailabilityStatus: "available" | "unavailable";
  initialReturnDate: string | null;
  /** When set, only that section renders. Default: render all sections stacked. */
  view?: CreatorStudioView;
};

const ORDER_NEXT_STATUS: Record<string, string | null> = {
  REQUESTED: "ACCEPTED",
  ACCEPTED: "IN_PROGRESS",
  IN_PROGRESS: "DELIVERED",
  DELIVERED: null,
  COMPLETED: null,
  CANCELLED: null,
};

const ORDER_NEXT_LABEL: Record<string, string> = {
  REQUESTED: "Accept order",
  ACCEPTED: "Start working",
  IN_PROGRESS: "Mark delivered",
};

function formatDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreatorStudioPanel({ token, initialAvailabilityStatus, initialReturnDate, view }: Props) {
  const showStats = view === undefined || view === "wallet";
  const showAvailability = view === undefined || view === "availability";
  const showOrders = view === undefined || view === "orders";
  const showWithdrawForm = view === undefined || view === "withdrawals";
  const showWithdrawHistory = view === undefined || view === "withdrawals";
  const [balance, setBalance] = useState<number | null>(null);
  const [availability, setAvailability] = useState<"available" | "unavailable">(initialAvailabilityStatus);
  const [returnDate, setReturnDate] = useState<string>(formatDateTimeLocal(initialReturnDate));
  const [withdrawCoins, setWithdrawCoins] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    const res = await fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json?.ok) setOrders(json.orders);
  }, [token]);

  const refreshBalance = useCallback(async () => {
    const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (json?.ok) setBalance(json.wallet.balanceCoins);
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [meRes, wRes, oRes] = await Promise.all([
        fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/withdrawals/mine", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/orders", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [meJson, wJson, oJson] = await Promise.all([meRes.json(), wRes.json(), oRes.json()]);
      if (cancelled) return;
      if (meJson?.ok) setBalance(meJson.wallet.balanceCoins);
      if (wJson?.ok) setWithdrawals(wJson.withdrawals);
      if (oJson?.ok) setOrders(oJson.orders);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const preview = withdrawCoins > 0 ? withdrawalNetDtFromCoins(withdrawCoins, 0.1) : null;
  const dtBalance = balance !== null ? coinsToDt(balance) : null;

  async function updateOrderStatus(id: string, status: string) {
    setOrderMsg(null);
    const res = await fetch(`/api/orders/${id}/status`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (!res.ok || !json?.ok) {
      setOrderMsg(json?.message ?? "Failed to update order.");
      return;
    }
    setOrderMsg(`Order updated to ${status}.`);
    await Promise.all([refreshOrders(), refreshBalance()]);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wallet:refresh"));
    }
  }

  return (
    <div className="space-y-8">
      {showStats ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Coin balance</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-stone-900">{balance === null ? "…" : balance}</p>
            <p className="mt-1 text-sm text-stone-600">coins in wallet</p>
          </div>
          <div className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Approx. value</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-stone-900">
              {dtBalance === null ? "…" : `${dtBalance.toFixed(1)} DT`}
            </p>
            <p className="mt-1 text-sm text-stone-600">at 10 coins = 1 DT</p>
          </div>
          <div className="rounded-2xl border border-stone-900/10 bg-surface-elevated p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Withdrawals</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-stone-900">{withdrawals.length}</p>
            <p className="mt-1 text-sm text-stone-600">requests all-time</p>
          </div>
        </div>
      ) : null}

      {msg ? (
        <div className="rounded-2xl border border-primary/30 bg-primary-muted/40 px-4 py-3 text-sm text-stone-900">{msg}</div>
      ) : null}

      {showAvailability ? (
      <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-stone-900">Availability</h2>
        <p className="mt-1 text-sm text-stone-600">
          Buyers see this badge on your profile. Use Unavailable for travel shoots or exclusivity windows.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-900/10 bg-secondary/40 px-4 py-3 has-[:checked]:border-primary/40 has-[:checked]:bg-primary-muted/30">
            <input
              type="radio"
              name="availability"
              checked={availability === "available"}
              onChange={() => setAvailability("available")}
              className="h-4 w-4 accent-primary"
            />
            <div>
              <span className="font-medium text-stone-900">Available</span>
              <p className="text-xs text-stone-500">Show in discovery and accept new briefs.</p>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-stone-900/10 bg-secondary/40 px-4 py-3 has-[:checked]:border-primary/40 has-[:checked]:bg-primary-muted/30">
            <input
              type="radio"
              name="availability"
              checked={availability === "unavailable"}
              onChange={() => setAvailability("unavailable")}
              className="h-4 w-4 accent-primary"
            />
            <div>
              <span className="font-medium text-stone-900">Unavailable</span>
              <p className="text-xs text-stone-500">Hide from new briefs while you finish existing work.</p>
            </div>
          </label>

          {availability === "unavailable" ? (
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Return date (optional)</span>
              <input
                type="datetime-local"
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
              />
            </label>
          ) : null}

          <button
            type="button"
            className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/20 ring-1 ring-stone-900/10"
            onClick={async () => {
              setMsg(null);
              const iso = returnDate ? new Date(returnDate).toISOString() : null;
              const res = await fetch("/api/creator/availability", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
                body: JSON.stringify({
                  status: availability,
                  returnDate: availability === "unavailable" ? iso : null,
                }),
              });
              const json = await res.json();
              if (!res.ok || !json?.ok) {
                setMsg(json?.message ?? "Failed to update availability.");
                return;
              }
              setMsg("Availability updated.");
            }}
          >
            Save availability
          </button>
        </div>
      </div>
      ) : null}

      {showOrders ? (
      <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm sm:p-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Orders inbox</h2>
            <p className="mt-1 text-sm text-stone-600">
              Briefs from clients. Accept to lock the deal — coins move from the client wallet to yours immediately.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void refreshOrders();
            }}
            className="rounded-full border border-stone-900/10 bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-stone-800 transition hover:border-primary/30"
          >
            Refresh
          </button>
        </div>

        {orderMsg ? (
          <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900">
            {orderMsg}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          {orders.length ? (
            orders.map((o) => {
              const next = ORDER_NEXT_STATUS[o.status];
              const clientName = o.client?.name ?? "Client";
              const clientImage = o.client?.image ?? null;
              return (
                <div
                  key={o.id}
                  className="rounded-2xl border border-stone-900/10 bg-secondary/30 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        name={clientName}
                        image={clientImage}
                        initialsTextClassName="text-xs"
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/25 to-accent-warm/20 ring-1 ring-stone-900/10"
                      />
                      <div className="min-w-0 text-sm">
                        <div className="font-semibold tabular-nums text-stone-900">
                          {o.totalCoins} coins · {o.items.length} item{o.items.length === 1 ? "" : "s"}
                        </div>
                        <div className="truncate text-xs text-stone-500">
                          From <span className="font-medium capitalize text-stone-700">{clientName}</span> ·{" "}
                          {new Date(o.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <span className="rounded-full border border-stone-900/10 bg-surface-elevated px-3 py-1 text-xs font-semibold text-stone-800">
                      {o.status}
                    </span>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs text-stone-700">
                    {o.items.map((it) => (
                      <li key={it.key} className="rounded-full border border-stone-900/10 bg-surface-elevated px-2 py-1">
                        {it.label} · {it.coins} coins
                      </li>
                    ))}
                  </ul>
                  {next || o.status === "REQUESTED" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {next ? (
                        <button
                          type="button"
                          className="inline-flex h-9 items-center justify-center rounded-full bg-stone-900 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800"
                          onClick={() => void updateOrderStatus(o.id, next)}
                        >
                          {ORDER_NEXT_LABEL[o.status] ?? `Move to ${next}`}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {o.status === "COMPLETED" && o.review ? (
                    <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                          Client review
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600" aria-label={`${o.review.stars} out of 5 stars`}>
                            {"★".repeat(o.review.stars)}
                            <span className="text-stone-300">{"★".repeat(5 - o.review.stars)}</span>
                          </span>
                          {o.review.createdAt ? (
                            <span className="text-xs text-stone-500">
                              {new Date(o.review.createdAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {o.review.text ? (
                        <blockquote className="mt-2 text-stone-800">
                          &ldquo;{o.review.text}&rdquo;
                        </blockquote>
                      ) : (
                        <p className="mt-2 italic text-stone-600">No written feedback.</p>
                      )}
                    </div>
                  ) : null}

                  {o.status === "COMPLETED" && !o.review ? (
                    <p className="mt-3 rounded-xl border border-dashed border-stone-900/15 bg-surface-elevated/60 px-3 py-2 text-xs text-stone-600">
                      Waiting for {clientName} to leave a review.
                    </p>
                  ) : null}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-stone-600">No orders yet — share your profile link with brands to get briefs in.</p>
          )}
        </div>
      </div>
      ) : null}

      {showWithdrawForm ? (
      <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-stone-900">Withdraw (versement)</h2>
        <p className="mt-1 text-sm text-stone-600">Platform commission: 10% · Net amount shown before you confirm.</p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Coins to withdraw</span>
            <input
              type="number"
              min={0}
              className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
              value={withdrawCoins || ""}
              onChange={(e) => setWithdrawCoins(Number(e.target.value))}
              placeholder="e.g. 500"
            />
          </label>

          {preview ? (
            <div className="rounded-2xl border border-stone-900/10 bg-secondary/40 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-stone-600">Gross</span>
                <span className="font-medium tabular-nums text-stone-900">{preview.grossDT} DT</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-stone-600">Commission (10%)</span>
                <span className="font-medium tabular-nums text-rose-700">− {preview.commissionDT} DT</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-stone-900/10 pt-2">
                <span className="text-stone-600">Net payout</span>
                <span className="font-semibold tabular-nums text-stone-900">{preview.netDT} DT</span>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-stone-900 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-stone-800"
            onClick={async () => {
              setMsg(null);
              const res = await fetch("/api/withdrawals", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
                body: JSON.stringify({ coins: withdrawCoins }),
              });
              const json = await res.json();
              if (!res.ok || !json?.ok) {
                setMsg(json?.message ?? "Withdrawal request failed.");
                return;
              }
              setBalance(json.wallet.balanceCoins);
              setWithdrawals((prev) => [json.withdrawal, ...prev]);
              setMsg("Withdrawal requested. Finance will process it shortly.");
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("wallet:refresh"));
              }
            }}
          >
            Request withdrawal
          </button>
        </div>
      </div>
      ) : null}

      {showWithdrawHistory ? (
      <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-stone-900">Withdrawal history</h2>
        <div className="mt-4 space-y-3">
          {withdrawals.length ? (
            withdrawals.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-900/10 bg-secondary/30 px-4 py-3"
              >
                <div className="text-sm">
                  <div className="font-semibold tabular-nums text-stone-900">
                    {w.coins} coins → {w.netDT} DT net
                  </div>
                  <div className="text-xs capitalize text-stone-500">{w.status}</div>
                </div>
                <div className="text-xs tabular-nums text-stone-500">{new Date(w.createdAt).toLocaleString()}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-600">No withdrawals yet — earnings will appear here after your first payout request.</p>
          )}
        </div>
      </div>
      ) : null}
    </div>
  );
}
