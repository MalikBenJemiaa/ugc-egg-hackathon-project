import type { Metadata } from "next";
import Link from "next/link";
import {
  CONTACT_ADDRESS,
  CONTACT_HOURS,
  CONTACT_RESPONSE_SLA,
} from "@/lib/site-content";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the egg team for support, partnerships, or press.",
};

const FAQ = [
  {
    q: "How fast can we onboard a brand team?",
    a: "Most teams complete registration, wallet top-up instructions, and first creator unlocks within the same business day once finance approves the initial DT transfer.",
  },
  {
    q: "Do you offer workshops for creators?",
    a: "Yes — we run quarterly virtual sessions on brief interpretation, pricing packs, and portfolio hygiene. Ask partnerships for the next cohort.",
  },
] as const;

export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:gap-10">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-3xl border border-stone-900/10 bg-surface-elevated p-8 shadow-lg shadow-stone-900/5 sm:p-10">
            <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-primary/15 blur-2xl" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">Contact</p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-stone-900">
              Let&apos;s plan your next creator sprint
            </h1>
            <p className="mt-4 max-w-xl text-pretty leading-relaxed text-stone-600">
              {CONTACT_RESPONSE_SLA} For urgent payout or security topics, mark your subject line with{" "}
              <span className="font-mono text-sm text-stone-800">[URGENT]</span>.
            </p>

            <dl className="mt-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-stone-900/10 bg-secondary/40 p-5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Support</dt>
                <dd className="mt-2">
                  <a
                    href="mailto:support@egg.tn?subject=egg%20%E2%80%94%20Support"
                    className="text-lg font-semibold text-stone-900 underline decoration-primary/60 decoration-2 underline-offset-4 hover:text-primary"
                  >
                    support@egg.tn
                  </a>
                  <p className="mt-2 text-sm text-stone-600">Accounts, coins, orders, and technical issues.</p>
                </dd>
              </div>
              <div className="rounded-2xl border border-stone-900/10 bg-secondary/40 p-5">
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Partnerships</dt>
                <dd className="mt-2">
                  <a
                    href="mailto:partners@egg.tn?subject=egg%20%E2%80%94%20Partnership"
                    className="text-lg font-semibold text-stone-900 underline decoration-primary/60 decoration-2 underline-offset-4 hover:text-primary"
                  >
                    partners@egg.tn
                  </a>
                  <p className="mt-2 text-sm text-stone-600">Retail networks, agencies, and education collabs.</p>
                </dd>
              </div>
            </dl>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href="mailto:support@egg.tn?subject=egg%20%E2%80%94%20Support&body=Hi%20egg%20team%2C%0A%0A"
                className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/25 ring-1 ring-stone-900/10"
              >
                Email support
              </a>
              <a
                href="mailto:partners@egg.tn?subject=egg%20%E2%80%94%20Partnership&body=Hi%20egg%20team%2C%0A%0A"
                className="inline-flex h-11 items-center justify-center rounded-full border border-stone-900/12 px-6 text-sm font-medium text-stone-800"
              >
                Email partnerships
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-8">
            <h2 className="text-lg font-semibold text-stone-900">Quick answers</h2>
            <ul className="mt-4 space-y-5">
              {FAQ.map((item) => (
                <li key={item.q}>
                  <p className="font-medium text-stone-900">{item.q}</p>
                  <p className="mt-1 text-sm leading-relaxed text-stone-600">{item.a}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-stone-900/10 bg-secondary/50 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Studio hours</h2>
            <p className="mt-3 text-sm font-medium text-stone-900">{CONTACT_HOURS}</p>
            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              Walk-in visits are by appointment so we can pull the right operator (trust & safety vs. finance).
            </p>
          </div>
          <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Address</h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-800">{CONTACT_ADDRESS}</p>
            <p className="mt-4 text-xs text-stone-500">
              Map pin: search &ldquo;Av. Habib Bourguiba Tunis&rdquo; — we sit above the main retail corridor with
              signage <span className="font-medium text-stone-700">egg / 4th floor</span>.
            </p>
          </div>
          <Link
            href="/auth/register"
            className="flex h-12 items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-primary-muted/30 text-sm font-semibold text-stone-900 transition hover:bg-primary-muted/50"
          >
            New here? Create an account →
          </Link>
        </aside>
      </div>
    </div>
  );
}
