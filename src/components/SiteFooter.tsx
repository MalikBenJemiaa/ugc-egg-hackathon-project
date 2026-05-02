import Link from "next/link";
import { CONTACT_ADDRESS } from "@/lib/site-content";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-900/10 bg-surface/90 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold tracking-tight text-stone-900">egg</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              UGC marketplace connecting brands with vetted creators across Tunisia — discovery, briefs, and
              payouts in one flow.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Explore</p>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li>
                <Link href="/" className="hover:text-stone-900">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-stone-900">
                  Our creators
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-stone-900">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="hover:text-stone-900">
                  Create account
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Creators</p>
            <ul className="mt-3 space-y-2 text-sm text-stone-600">
              <li>
                <Link href="/auth/register" className="hover:text-stone-900">
                  Join as creator
                </Link>
              </li>
              <li>
                <Link href="/dashboard/creator" className="hover:text-stone-900">
                  Creator studio
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Visit</p>
            <p className="mt-3 text-sm leading-relaxed text-stone-600">{CONTACT_ADDRESS}</p>
            <p className="mt-2 text-xs text-stone-500">By appointment for in-person onboarding.</p>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-stone-900/10 pt-8 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} egg. All rights reserved.</span>
          <span className="text-stone-500">1 DT = 10 coins · Tunisia-first marketplace</span>
        </div>
      </div>
    </footer>
  );
}
