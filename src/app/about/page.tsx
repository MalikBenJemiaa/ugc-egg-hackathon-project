import type { Metadata } from "next";
import Link from "next/link";
import { CreatorsLockedShowcase } from "@/components/CreatorsLockedShowcase";

export const metadata: Metadata = {
  title: "Our creators",
  description: "Browse every vetted UGC creator on egg. Sign in and add coins to unlock full profiles.",
};

export default function OurCreatorsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <header className="relative overflow-hidden rounded-3xl border border-stone-900/10 bg-surface-elevated p-8 shadow-lg shadow-stone-900/5 sm:p-12">
        <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Our creators</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Vetted UGC talent across Tunisia
          </h1>
          <p className="mt-5 text-pretty text-lg leading-relaxed text-stone-600">
            Every creator below has cleared verification and keeps a funded wallet. Profiles stay locked until you
            sign in and top up — that&apos;s how we keep contact details safe and serious.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/auth/register"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/20 ring-1 ring-stone-900/10"
            >
              Sign up to unlock
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-11 items-center justify-center rounded-full border border-stone-900/12 px-6 text-sm font-medium text-stone-800"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-12 lg:mt-16">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">All creators</h2>
            <p className="mt-1 max-w-2xl text-stone-600">
              Locked previews — sign in, fund your wallet, then open a profile to see contact, pricing, and
              portfolio.
            </p>
          </div>
        </div>
        <CreatorsLockedShowcase />
      </section>
    </div>
  );
}
