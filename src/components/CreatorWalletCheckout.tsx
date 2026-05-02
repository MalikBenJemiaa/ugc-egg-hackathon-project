"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type CoinPackageRow = {
  id: string;
  name: string;
  dtPrice: number;
  coinsReceived: number;
  bonusCoins: number;
};

type PackagesJson = { ok?: boolean; packages?: CoinPackageRow[] };

type TopupJson = {
  ok?: boolean;
  message?: string;
  wallet?: { balanceCoins: number };
  creditedCoins?: number;
  dtPaid?: number;
};

type Provider = "konnect" | "paymee";

type Props = {
  token: string | null;
  onFunded: () => void;
  /** Override the small uppercase eyebrow above the title. */
  eyebrow?: string;
  /** Override the headline shown above the form. */
  title?: string;
  /** Override the helper paragraph under the headline. */
  description?: React.ReactNode;
  /** Override the button label shown after a successful top-up. */
  successCtaLabel?: string;
  /** Hide the bottom "back to creator list" link. */
  hideBackLink?: boolean;
  /** Hide the wrapping card so the component blends into a parent panel. */
  bare?: boolean;
};

export function CreatorWalletCheckout({
  token,
  onFunded,
  eyebrow,
  title,
  description,
  successCtaLabel,
  hideBackLink,
  bare,
}: Props) {
  const [packages, setPackages] = useState<CoinPackageRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string>("");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [step, setStep] = useState<"pick" | "processing" | "done">("pick");
  const [topupErr, setTopupErr] = useState<string | null>(null);
  const [balanceAfter, setBalanceAfter] = useState<number | null>(null);
  const [credited, setCredited] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/coin-packages");
        const json = (await res.json()) as PackagesJson;
        if (!res.ok || !json?.ok || !json.packages?.length) {
          if (!cancelled) setLoadErr("Could not load coin packages.");
          return;
        }
        if (!cancelled) {
          setPackages(json.packages);
          setPackageId(json.packages[0]!.id);
        }
      } catch {
        if (!cancelled) setLoadErr("Could not load coin packages.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completePayment = useCallback(async () => {
    if (!token || !packageId || !provider) return;
    setTopupErr(null);
    setStep("processing");
    await new Promise((r) => setTimeout(r, 1600));
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ packageId, paymentProvider: provider }),
      });
      const json = (await res.json()) as TopupJson;
      if (!res.ok || !json?.ok) {
        setTopupErr(json?.message ?? "Payment could not be completed.");
        setStep("pick");
        return;
      }
      setBalanceAfter(json.wallet?.balanceCoins ?? null);
      setCredited(json.creditedCoins ?? null);
      setStep("done");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("wallet:refresh"));
      }
    } catch {
      setTopupErr("Connection issue — please try again.");
      setStep("pick");
    }
  }, [packageId, provider, token]);

  const selectedPkg = packages.find((p) => p.id === packageId);

  const outerClass = bare ? "w-full" : "mx-auto max-w-xl px-4 py-10 sm:px-6";
  const innerClass = bare
    ? "rounded-3xl bg-surface-elevated p-6 sm:p-8"
    : "rounded-3xl border border-amber-500/35 bg-gradient-to-b from-amber-500/12 to-surface-elevated p-6 shadow-lg shadow-stone-900/5 sm:p-8";

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-800/90">
          {eyebrow ?? "Wallet checkout · Tunisia"}
        </p>
        <h1 className="mt-2 text-center text-2xl font-semibold tracking-tight text-stone-900">
          {title ?? "Top up to unlock this profile"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-relaxed text-stone-600">
          {description ?? (
            <>
              Opening a creator profile uses <span className="font-semibold text-stone-800">1 coin</span> from
              your balance. Add coins in Tunisian dinar through Konnect or Paymee, then return here to continue.
            </>
          )}
        </p>

        {!token ? (
          <p className="mt-6 text-center text-sm text-stone-600">Your session expired. Please sign in again.</p>
        ) : loadErr ? (
          <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm text-rose-900">
            {loadErr}
          </p>
        ) : step === "done" ? (
          <div className="mt-8 space-y-6 text-center">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-5">
              <p className="text-sm font-semibold text-emerald-950">Payment received</p>
              {credited != null ? (
                <p className="mt-2 text-sm text-emerald-900">
                  <span className="font-bold tabular-nums">{credited}</span> coins were added to your wallet.
                </p>
              ) : null}
              {balanceAfter != null ? (
                <p className="mt-1 text-xs text-emerald-800/90">
                  New balance: <span className="font-semibold tabular-nums">{balanceAfter}</span> coins
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onFunded}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-stone-900 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-stone-800 sm:w-auto sm:min-w-[240px]"
            >
              {successCtaLabel ?? "Return to creator profile"}
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">1 · Coin pack</h2>
              <p className="mt-1 text-xs text-stone-500">Choose how many coins you want (DT converted at checkout).</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {packages.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPackageId(p.id)}
                    className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                      packageId === p.id
                        ? "border-primary bg-primary-muted/60 ring-2 ring-primary/35"
                        : "border-stone-900/10 bg-secondary/50 hover:border-stone-900/20"
                    }`}
                  >
                    <span className="font-semibold text-stone-900">{p.name}</span>
                    <span className="mt-1 block text-xs text-stone-600">
                      {p.coinsReceived + p.bonusCoins} coins
                      {p.bonusCoins ? (
                        <span className="font-medium text-emerald-800"> (+{p.bonusCoins} bonus)</span>
                      ) : null}{" "}
                      · {p.dtPrice} DT
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">2 · Payment method</h2>
              <p className="mt-1 text-xs text-stone-500">
                Pay in DT with a Tunisian provider. Pick the option your finance team already uses.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setProvider("konnect")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    provider === "konnect"
                      ? "border-sky-500/50 bg-sky-500/10 ring-2 ring-sky-500/30"
                      : "border-stone-900/10 bg-white/80 hover:border-stone-900/18"
                  }`}
                >
                  <span className="text-sm font-bold tracking-tight text-sky-950">Konnect</span>
                  <span className="mt-1 block text-xs leading-snug text-stone-600">
                    Cards, wallets, and business-friendly checkout used across Tunisia.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("paymee")}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    provider === "paymee"
                      ? "border-violet-500/45 bg-violet-500/10 ring-2 ring-violet-400/35"
                      : "border-stone-900/10 bg-white/80 hover:border-stone-900/18"
                  }`}
                >
                  <span className="text-sm font-bold tracking-tight text-violet-950">Paymee</span>
                  <span className="mt-1 block text-xs leading-snug text-stone-600">
                    Local acquiring with Tunisian cards and fast confirmation on supported flows.
                  </span>
                </button>
              </div>
            </section>

            {topupErr ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-center text-sm text-rose-900">
                {topupErr}
              </p>
            ) : null}

            <button
              type="button"
              disabled={!packageId || !provider || step === "processing"}
              onClick={completePayment}
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/25 ring-1 ring-stone-900/10 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {step === "processing"
                ? "Confirming payment…"
                : selectedPkg
                  ? `Pay ${selectedPkg.dtPrice} DT & add coins`
                  : "Pay & add coins"}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-stone-500">
              Card and bank details are handled only by the provider you select. Viral stores your coin balance after
              confirmation.
            </p>
            {hideBackLink ? null : (
              <p className="text-center">
                <Link
                  href="/creators"
                  className="text-xs font-medium text-stone-600 underline decoration-stone-400/80 underline-offset-2 hover:text-stone-900"
                >
                  Back to creator list
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
