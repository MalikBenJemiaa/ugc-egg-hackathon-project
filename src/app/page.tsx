import type { Metadata } from "next";
import Link from "next/link";
import {
  ABOUT_TIMELINE,
  HOME_STATS,
  HOME_TESTIMONIALS,
  HOW_IT_WORKS,
  NICHE_HIGHLIGHTS,
} from "@/lib/site-content";

export const metadata: Metadata = {
  description: "Hire vetted UGC creators in Tunisia. Browse profiles, pay with coins, and run measurable campaigns.",
};

function IconCompass({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M13.5 10.5 16 8l-2.5 2.5L12 12l-1.5 1.5L8 16l2.5-2.5L12 12l1.5-1.5Z" />
    </svg>
  );
}

function IconCoins({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 3 5 6v6c0 5 3.4 9.2 7 10 3.6-.8 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const PILLARS = [
  {
    title: "Discover creators",
    desc: "Search by niche, platform, language, city, and rating — then unlock full profiles when you are ready.",
    icon: IconCompass,
  },
  {
    title: "Coin-based payments",
    desc: "Top up in Tunisian dinar, spend in coins, and keep every unlock and deliverable on one transparent ledger.",
    icon: IconCoins,
  },
  {
    title: "Trust & verification",
    desc: "Admin-reviewed profiles plus ratings from real orders help you brief faster with less guesswork.",
    icon: IconShield,
  },
] as const;

const VALUES = [
  {
    title: "Clarity over chaos",
    body: "Every unlock and deliverable is priced in coins with a published DT conversion — fewer surprises in finance reviews.",
  },
  {
    title: "Local context",
    body: "Creators across Tunis, Sousse, Sfax, and coastal cities understand bilingual briefs and regional taste.",
  },
  {
    title: "Quality bar",
    body: "Profiles pass admin verification before they appear in discovery; ratings reinforce good delivery habits.",
  },
] as const;

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <section className="relative overflow-hidden rounded-3xl border border-stone-900/10 bg-surface-elevated p-8 shadow-lg shadow-stone-900/5 sm:p-10 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:p-12">
        <div
          className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-accent-warm/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <div className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-stone-900/10 bg-secondary/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-stone-700">
              Tunisia · UGC marketplace
            </span>
            <span className="rounded-full border border-primary/30 bg-primary-muted/60 px-3 py-1 text-xs font-medium text-stone-800">
              1 DT = 10 coins
            </span>
          </div>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl lg:text-[3.25rem]">
            Hire creators who already speak your customer&apos;s language.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-stone-600">
            egg connects brands with vetted TikTok, Instagram, and short-form creators across Tunisia — from
            brief to delivery without losing context in DMs.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/auth/register"
              className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-stone-900 shadow-md shadow-primary/25 ring-1 ring-stone-900/10 transition hover:brightness-105"
            >
              Create free account
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center justify-center rounded-full border border-stone-900/15 bg-surface/50 px-8 text-sm font-medium text-stone-800 backdrop-blur-sm transition hover:bg-surface"
            >
              Meet our creators
            </Link>
          </div>

          <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-stone-900/10 pt-8 sm:max-w-lg">
            {HOME_STATS.map((s) => (
              <div key={s.label}>
                <dt className="text-xs font-medium text-stone-500">{s.label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{s.value}</dd>
                <p className="mt-0.5 text-[11px] leading-snug text-stone-500">{s.hint}</p>
              </div>
            ))}
          </dl>
        </div>

        <aside className="relative mt-10 flex flex-col gap-4 lg:mt-0">
          <div className="rounded-2xl border border-primary/25 bg-primary-muted/40 p-5">
            <p className="text-sm font-semibold text-stone-900">Pilot brands see faster cycles</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-700">
              Typical campaigns pair 2–3 creators for one product line: one awareness reel, one testimonial, one
              &quot;reason to believe&quot; cut — all tracked inside egg.
            </p>
          </div>
        </aside>
      </section>

      <section className="mt-14 lg:mt-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Built for real workflows</h2>
          <p className="mt-3 text-stone-600">
            Whether you run a single location in La Marsa or a chain in Sfax, the same primitives apply: discover,
            unlock, order, review.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PILLARS.map(({ title, desc, icon: Icon }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/20">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-lg font-semibold tracking-tight text-stone-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-3xl border border-stone-900/10 bg-surface-elevated/90 p-8 shadow-inner shadow-stone-900/5 sm:p-10 lg:mt-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900">From first brief to final file</h2>
            <p className="mt-2 text-stone-600">A linear path your team can repeat every quarter.</p>
          </div>
          <ol className="grid flex-1 gap-6 sm:grid-cols-3 lg:max-w-3xl">
            {HOW_IT_WORKS.map((s) => (
              <li key={s.step} className="relative rounded-2xl border border-stone-900/10 bg-secondary/40 p-5">
                <span className="font-mono text-xs font-semibold text-primary">{s.step}</span>
                <p className="mt-2 font-semibold text-stone-900">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-14 lg:mt-20">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">Where egg shines</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {NICHE_HIGHLIGHTS.map((n) => (
            <div key={n.title} className="rounded-2xl border border-dashed border-stone-900/15 bg-surface/50 p-5">
              <p className="font-semibold text-stone-900">{n.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">{n.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 lg:mt-20">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl">What teams say</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {HOME_TESTIMONIALS.map((t) => (
            <blockquote
              key={t.name}
              className="relative rounded-2xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm sm:p-8"
            >
              <span className="font-serif text-4xl leading-none text-primary/40" aria-hidden>
                &ldquo;
              </span>
              <p className="-mt-2 text-base leading-relaxed text-stone-700">{t.quote}</p>
              <footer className="mt-5 border-t border-stone-900/10 pt-4">
                <cite className="not-italic">
                  <span className="font-semibold text-stone-900">{t.name}</span>
                  <span className="mt-0.5 block text-sm text-stone-500">{t.role}</span>
                </cite>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      <section className="mt-14 grid gap-8 lg:mt-20 lg:grid-cols-2 lg:gap-12">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Who we serve</h2>
          <ul className="mt-6 space-y-5 text-stone-700">
            <li className="flex gap-4">
              <span className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-stone-900">
                B
              </span>
              <div>
                <p className="font-semibold text-stone-900">Brand & growth teams</p>
                <p className="mt-1 text-sm leading-relaxed">
                  Launch promos, retail openings, and product education with creators who already film in your
                  category — filter by niche, city, and language before you spend a coin.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-stone-900">
                C
              </span>
              <div>
                <p className="font-semibold text-stone-900">Independent creators</p>
                <p className="mt-1 text-sm leading-relaxed">
                  Publish pricing packs, manage availability, request withdrawals, and let reviews do the talking
                  for the next inbound brief.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="mt-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-xs font-bold text-stone-900">
                A
              </span>
              <div>
                <p className="font-semibold text-stone-900">Agencies & resellers</p>
                <p className="mt-1 text-sm leading-relaxed">
                  Coordinate multiple client workspaces with clear coin spend per creator unlock — ideal for small
                  shops supporting local FMCG and hospitality groups.
                </p>
              </div>
            </li>
          </ul>
        </div>
        <div className="rounded-3xl border border-stone-900/10 bg-secondary/50 p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Operating principles</h2>
          <div className="mt-6 space-y-6">
            {VALUES.map((v) => (
              <div key={v.title}>
                <h3 className="font-semibold text-stone-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-14 lg:mt-20">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900">Roadmap highlights</h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          We ship incrementally with operators in Tunis and Sfax — here is how the product matured.
        </p>
        <ol className="mt-8 space-y-6 border-l-2 border-primary/40 pl-8">
          {ABOUT_TIMELINE.map((item) => (
            <li key={item.year} className="relative">
              <span className="absolute -left-[2.125rem] top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-stone-900 ring-4 ring-[var(--background)]">
                {item.year.slice(2)}
              </span>
              <p className="font-semibold text-stone-900">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-stone-600">{item.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-16 lg:mt-24">
        <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-8 shadow-sm sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900">See who is on egg</h2>
              <p className="mt-2 max-w-xl text-stone-600">
                Locked previews of every verified creator. Sign in and add coins to open a profile.
              </p>
            </div>
            <Link
              href="/about"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 ring-1 ring-stone-900/10"
            >
              Browse our creators
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
