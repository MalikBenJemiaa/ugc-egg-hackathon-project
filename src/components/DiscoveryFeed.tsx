"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/token-storage";
import { UserAvatar } from "@/components/UserAvatar";
import { formatCompactNumber } from "@/lib/format";
import {
  DISCOVERY_AGE_PRESETS,
  DISCOVERY_CITIES,
  DISCOVERY_CONTENT_TYPES,
  DISCOVERY_LANGUAGES,
  DISCOVERY_NICHES,
  DISCOVERY_PLATFORM_PRESETS,
} from "@/lib/discovery-filters";

type CreatorCard = {
  id: string;
  name: string;
  image?: string | null;
  city: string | null;
  niches: string[];
  tier: "standard" | "premium";
  ratingAvg: number;
  ratingCount: number;
  platforms?: string[];
  avgViews?: number | null;
  avgEngagementRate?: number | null;
  fromCoins?: number | null;
};

type CreatorsResponse =
  | { ok: true; premium: CreatorCard[]; standard: CreatorCard[] }
  | { ok: false; code: string; message: string };

function FeedSkeleton({ cardGridClass }: { cardGridClass: string }) {
  return (
    <div className={`grid ${cardGridClass}`}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-stone-900/10 bg-surface-elevated p-5"
        >
          <div className="flex gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl bg-stone-200/80 sm:h-16 sm:w-16" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 max-w-full rounded bg-stone-200/80" />
              <div className="h-3 w-32 max-w-full rounded bg-stone-200/60" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-stone-200/60" />
            <div className="h-6 w-20 rounded-full bg-stone-200/60" />
          </div>
        </div>
      ))}
    </div>
  );
}

function FilterSection({
  category,
  optionsHint,
  children,
}: {
  category: string;
  optionsHint?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-900/10 bg-secondary/40 p-4 shadow-sm">
      <div className="border-b border-stone-900/10 pb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">{category}</h3>
        {optionsHint ? (
          <p className="mt-1 text-[11px] leading-snug text-stone-500">{optionsHint}</p>
        ) : null}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function buildCreatorsQueryString(f: {
  niches: string[];
  languages: string[];
  gender: string;
  agePresetId: string;
  platform: string;
  city: string;
  contentTypes: string[];
  priceMin: string;
  priceMax: string;
  minRating: string;
  availableOnly: boolean;
  tiers: { standard: boolean; premium: boolean };
}): string {
  const qs = new URLSearchParams();
  for (const n of f.niches) qs.append("niche", n);
  for (const l of f.languages) qs.append("language", l);
  if (f.gender === "man" || f.gender === "woman") qs.set("gender", f.gender);

  const agePreset = DISCOVERY_AGE_PRESETS.find((p) => p.id === f.agePresetId);
  if (agePreset && "min" in agePreset) {
    qs.set("ageMin", String(agePreset.min));
    qs.set("ageMax", String(agePreset.max));
  }

  if (f.platform) qs.set("platform", f.platform);
  if (f.city) qs.set("city", f.city);
  for (const c of f.contentTypes) qs.append("content", c);

  const pMin = f.priceMin.trim();
  const pMax = f.priceMax.trim();
  if (pMin) qs.set("priceMin", pMin);
  if (pMax) qs.set("priceMax", pMax);
  if (f.minRating) qs.set("minRating", f.minRating);
  if (!f.availableOnly) qs.set("availableOnly", "false");

  const { standard: ts, premium: tp } = f.tiers;
  if (ts !== tp) {
    if (ts) qs.append("tier", "standard");
    if (tp) qs.append("tier", "premium");
  }

  return qs.toString();
}

function filtersActive(f: {
  niches: string[];
  languages: string[];
  gender: string;
  agePresetId: string;
  platform: string;
  city: string;
  contentTypes: string[];
  priceMin: string;
  priceMax: string;
  minRating: string;
  availableOnly: boolean;
  tiers: { standard: boolean; premium: boolean };
}): boolean {
  return (
    f.niches.length > 0 ||
    f.languages.length > 0 ||
    f.gender !== "" ||
    f.agePresetId !== "" ||
    f.platform !== "" ||
    f.city !== "" ||
    f.contentTypes.length > 0 ||
    f.priceMin.trim() !== "" ||
    f.priceMax.trim() !== "" ||
    f.minRating !== "" ||
    !f.availableOnly ||
    !f.tiers.standard ||
    !f.tiers.premium
  );
}

const DEFAULT_FILTERS = {
  niches: [] as string[],
  languages: [] as string[],
  gender: "",
  agePresetId: "",
  platform: "",
  city: "",
  contentTypes: [] as string[],
  priceMin: "",
  priceMax: "",
  minRating: "",
  availableOnly: true,
  tiers: { standard: true, premium: true },
};

type DiscoveryLayout = "default" | "browse";

export function DiscoveryFeed({ layout = "default" }: { layout?: DiscoveryLayout }) {
  const isBrowse = layout === "browse";
  const outerGridClass = isBrowse
    ? "grid gap-6 lg:gap-8 xl:grid-cols-[minmax(340px,400px)_minmax(0,1fr)] xl:gap-10 2xl:grid-cols-[minmax(380px,440px)_minmax(0,1fr)] 2xl:gap-12"
    : "grid gap-8 xl:grid-cols-[minmax(380px,min(440px,100%))_1fr] xl:gap-12";
  const cardGridClass = isBrowse
    ? "gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-2"
    : "gap-4 sm:grid-cols-2 xl:grid-cols-3";

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CreatorsResponse | null>(null);

  const [niches, setNiches] = useState<string[]>(DEFAULT_FILTERS.niches);
  const [languages, setLanguages] = useState<string[]>(DEFAULT_FILTERS.languages);
  const [gender, setGender] = useState(DEFAULT_FILTERS.gender);
  const [agePresetId, setAgePresetId] = useState(DEFAULT_FILTERS.agePresetId);
  const [platform, setPlatform] = useState(DEFAULT_FILTERS.platform);
  const [city, setCity] = useState(DEFAULT_FILTERS.city);
  const [contentTypes, setContentTypes] = useState<string[]>(DEFAULT_FILTERS.contentTypes);
  const [priceMin, setPriceMin] = useState(DEFAULT_FILTERS.priceMin);
  const [priceMax, setPriceMax] = useState(DEFAULT_FILTERS.priceMax);
  const [minRating, setMinRating] = useState(DEFAULT_FILTERS.minRating);
  const [availableOnly, setAvailableOnly] = useState(DEFAULT_FILTERS.availableOnly);
  const [tiers, setTiers] = useState(DEFAULT_FILTERS.tiers);

  const queryString = useMemo(
    () =>
      buildCreatorsQueryString({
        niches,
        languages,
        gender,
        agePresetId,
        platform,
        city,
        contentTypes,
        priceMin,
        priceMax,
        minRating,
        availableOnly,
        tiers,
      }),
    [
      niches,
      languages,
      gender,
      agePresetId,
      platform,
      city,
      contentTypes,
      priceMin,
      priceMax,
      minRating,
      availableOnly,
      tiers,
    ]
  );

  const active = useMemo(
    () =>
      filtersActive({
        niches,
        languages,
        gender,
        agePresetId,
        platform,
        city,
        contentTypes,
        priceMin,
        priceMax,
        minRating,
        availableOnly,
        tiers,
      }),
    [
      niches,
      languages,
      gender,
      agePresetId,
      platform,
      city,
      contentTypes,
      priceMin,
      priceMax,
      minRating,
      availableOnly,
      tiers,
    ]
  );

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/creators?${queryString}`);
        const json = (await res.json()) as CreatorsResponse;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const premium = data && data.ok ? data.premium : [];
  const standard = data && data.ok ? data.standard : [];
  const totalCount = premium.length + standard.length;

  const clearFilters = useCallback(() => {
    setNiches([...DEFAULT_FILTERS.niches]);
    setLanguages([...DEFAULT_FILTERS.languages]);
    setGender(DEFAULT_FILTERS.gender);
    setAgePresetId(DEFAULT_FILTERS.agePresetId);
    setPlatform(DEFAULT_FILTERS.platform);
    setCity(DEFAULT_FILTERS.city);
    setContentTypes([...DEFAULT_FILTERS.contentTypes]);
    setPriceMin(DEFAULT_FILTERS.priceMin);
    setPriceMax(DEFAULT_FILTERS.priceMax);
    setMinRating(DEFAULT_FILTERS.minRating);
    setAvailableOnly(DEFAULT_FILTERS.availableOnly);
    setTiers({ ...DEFAULT_FILTERS.tiers });
  }, []);

  const checkboxClass =
    "h-4 w-4 shrink-0 cursor-pointer rounded border-stone-900/25 text-primary accent-primary focus:ring-primary/40";

  return (
    <div className={outerGridClass}>
      <aside className="h-fit xl:sticky xl:top-20 xl:max-h-[calc(100vh-5rem)] xl:overflow-y-auto xl:pr-1">
        <div
          className={`rounded-2xl border border-stone-900/10 bg-surface-elevated shadow-md ${isBrowse ? "p-6 sm:p-7 lg:p-8" : "p-5 sm:p-6"}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-900/10 pb-4">
            <div>
              <h2 className={`font-semibold tracking-tight text-stone-900 ${isBrowse ? "text-xl" : "text-lg"}`}>
                Filters
              </h2>
              <p
                className={`mt-1 leading-relaxed text-stone-500 ${isBrowse ? "max-w-md text-sm" : "max-w-sm text-xs"}`}
              >
                Narrow creators by domain, audience, budget, and availability. Results refresh automatically.
              </p>
            </div>
            {active ? (
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 rounded-full border border-stone-900/12 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-stone-800 transition hover:bg-secondary"
              >
                Clear all
              </button>
            ) : null}
          </div>

          <div className="mt-5 space-y-5">
            <FilterSection
              category="Domain / niche"
              optionsHint="Restaurant, Food & Beverage, Fashion & Clothes, Coffee & Cafe, Sport & Fitness, Beauty & Skincare, Tech & Electronics, Travel, Home Decor, Health & Wellness, Automotive, Pets, Other — pick any that apply."
            >
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1 sm:grid sm:max-h-none sm:grid-cols-2 sm:gap-x-2 sm:gap-y-1.5 sm:space-y-0">
                {DISCOVERY_NICHES.map((n) => (
                  <label key={n} className="flex cursor-pointer items-start gap-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={niches.includes(n)}
                      onChange={() => setNiches((prev) => toggleInList(prev, n))}
                    />
                    <span className="leading-snug">{n}</span>
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection category="Gender" optionsHint="Man · Woman">
              <select
                className="w-full cursor-pointer rounded-xl border border-stone-900/12 bg-secondary/80 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/40"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Any</option>
                <option value="man">Man</option>
                <option value="woman">Woman</option>
              </select>
            </FilterSection>

            <FilterSection category="Age range" optionsHint="Preset bands (approximate for discovery).">
              <select
                className="w-full cursor-pointer rounded-xl border border-stone-900/12 bg-secondary/80 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/40"
                value={agePresetId}
                onChange={(e) => setAgePresetId(e.target.value)}
              >
                {DISCOVERY_AGE_PRESETS.map((p) => (
                  <option key={"min" in p ? p.id : "any-age"} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </FilterSection>

            <FilterSection
              category="Platform"
              optionsHint="Instagram, TikTok, YouTube, Instagram + TikTok (both), or all platforms."
            >
              <select
                className="w-full cursor-pointer rounded-xl border border-stone-900/12 bg-secondary/80 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/40"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                {DISCOVERY_PLATFORM_PRESETS.map((p) => (
                  <option key={p.id || "all-platforms"} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </FilterSection>

            <FilterSection
              category="Language"
              optionsHint="Arabic, French, English, Chinese, Spanish, German, Other — creators listing at least one selected language."
            >
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {DISCOVERY_LANGUAGES.map((lang) => (
                  <label key={lang} className="flex cursor-pointer items-center gap-1.5 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={languages.includes(lang)}
                      onChange={() => setLanguages((prev) => toggleInList(prev, lang))}
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection category="Location" optionsHint="City or region within Tunisia (exact profile city).">
              <select
                className="w-full cursor-pointer rounded-xl border border-stone-900/12 bg-secondary/80 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/40"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">All cities / regions</option>
                {DISCOVERY_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </FilterSection>

            <FilterSection
              category="Content type"
              optionsHint="Video UGC, photo / static post, story / reel, full campaign pack — creators with that line item priced above zero (any match if several ticked)."
            >
              <div className="space-y-2">
                {DISCOVERY_CONTENT_TYPES.map((ct) => (
                  <label key={ct.id} className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      className={checkboxClass}
                      checked={contentTypes.includes(ct.id)}
                      onChange={() => setContentTypes((prev) => toggleInList(prev, ct.id))}
                    />
                    {ct.label}
                  </label>
                ))}
              </div>
            </FilterSection>

            <FilterSection category="Price range (coins)" optionsHint="Filter by lowest published rate on their card (minimum positive coin price).">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-medium text-stone-500">Min coins</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="0"
                    className="mt-1 w-full rounded-xl border border-stone-900/12 bg-secondary/80 px-3 py-2 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/40"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-medium text-stone-500">Max coins</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="No max"
                    className="mt-1 w-full rounded-xl border border-stone-900/12 bg-secondary/80 px-3 py-2 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/40"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </label>
              </div>
            </FilterSection>

            <FilterSection category="Star rating" optionsHint="Minimum average from verified reviews.">
              <select
                className="w-full cursor-pointer rounded-xl border border-stone-900/12 bg-secondary/80 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:ring-2 focus:ring-primary/40"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
              >
                <option value="">Any rating</option>
                <option value="3">3+ stars</option>
                <option value="4">4+ stars</option>
                <option value="4.5">4.5+ stars</option>
                <option value="5">5 stars only</option>
              </select>
            </FilterSection>

            <FilterSection category="Availability" optionsHint="When on, unavailable creators are hidden from results.">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stone-900/10 bg-secondary/60 px-3 py-3">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                />
                <span className="text-sm font-medium text-stone-900">Available now only</span>
              </label>
            </FilterSection>

            <FilterSection category="Creator tier" optionsHint="Standard · Premium — leave both on to see everyone.">
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-800">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={tiers.standard}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setTiers((t) => {
                        const next = { ...t, standard: v };
                        if (!next.standard && !next.premium) return { standard: true, premium: true };
                        return next;
                      });
                    }}
                  />
                  Standard
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-800">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={tiers.premium}
                    onChange={(e) => {
                      const v = e.target.checked;
                      setTiers((t) => {
                        const next = { ...t, premium: v };
                        if (!next.standard && !next.premium) return { standard: true, premium: true };
                        return next;
                      });
                    }}
                  />
                  Premium
                </label>
              </div>
            </FilterSection>

            {!isLoggedIn ? (
              <div className="rounded-xl border border-primary/25 bg-primary-muted/50 p-4 text-sm leading-relaxed text-stone-800">
                <p className="font-medium text-stone-900">Preview mode</p>
                <p className="mt-1 text-stone-700">
                  Create an account to unlock phone numbers, full bios, and ordering.
                </p>
                <Link
                  href="/auth/register"
                  className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-stone-900 ring-1 ring-stone-900/10"
                >
                  Get started
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        {loading ? (
          <div className="space-y-8">
            <div>
              <div className="mb-3 h-4 w-40 animate-pulse rounded bg-stone-200/80" />
              <FeedSkeleton cardGridClass={cardGridClass} />
            </div>
          </div>
        ) : data && !data.ok ? (
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-800">
            {data.message}
          </div>
        ) : (
          <div className="space-y-10">
            <p className="text-sm text-stone-500">
              Showing <span className="font-medium text-stone-800">{totalCount}</span> creators with funded wallets
              {isBrowse ? " across Premium and Standard tiers" : ""}
              {active ? " matching your filters" : ""}.
            </p>

            {premium.length ? (
              <div>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                      {isBrowse ? "Premium" : "Premium spotlight"}
                    </h3>
                    <p className="text-sm text-stone-600">
                      {isBrowse
                        ? "Featured tier with higher visibility in discovery."
                        : "Higher visibility tier · prioritized in discovery"}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-stone-900">
                    {premium.length} profiles
                  </span>
                </div>
                <div className={`grid ${cardGridClass}`}>
                  {premium.map((c) => (
                    <CreatorTile key={c.id} creator={c} locked={!isLoggedIn} size={isBrowse ? "large" : "default"} />
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-stone-900">
                    {isBrowse ? "Standard" : "All creators"}
                  </h3>
                  <p className="text-sm text-stone-600">
                    {isBrowse
                      ? "Standard tier creators — unlock profiles to see full detail and order."
                      : "Mix of niches and cities — unlock to see full detail"}
                  </p>
                </div>
                <span className="text-xs font-medium tabular-nums text-stone-500">
                  {standard.length} {isBrowse ? "profiles" : "listed"}
                </span>
              </div>
              <div className={`grid ${cardGridClass}`}>
                {standard.map((c) => (
                  <CreatorTile key={c.id} creator={c} locked={!isLoggedIn} size={isBrowse ? "large" : "default"} />
                ))}
              </div>
              {!standard.length && !premium.length ? (
                <div className="rounded-2xl border border-dashed border-stone-900/20 bg-surface/50 p-8 text-center">
                  <p className="font-medium text-stone-900">No creators match these filters</p>
                  <p className="mt-1 text-sm text-stone-600">Try clearing filters or broadening your criteria.</p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-stone-900"
                  >
                    Reset filters
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function CreatorTile({
  creator,
  locked,
  size = "default",
}: {
  creator: CreatorCard;
  locked: boolean;
  size?: "default" | "large";
}) {
  const views = creator.avgViews != null ? formatCompactNumber(creator.avgViews) : null;
  const eng = creator.avgEngagementRate != null ? `${creator.avgEngagementRate}% eng.` : null;
  const platform = creator.platforms?.[0];
  const large = size === "large";
  const nicheLimit = large ? 6 : 3;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-900/10 bg-surface-elevated shadow-sm transition hover:border-primary/35 hover:shadow-md">
      <div className={`flex gap-4 ${large ? "gap-5 p-6 sm:p-7" : "p-5"}`}>
        <UserAvatar
          name={creator.name}
          image={creator.image}
          className={
            large
              ? "relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-accent-warm/20 ring-1 ring-stone-900/10 sm:h-[5rem] sm:w-[5rem]"
              : undefined
          }
          initialsTextClassName={large ? "text-base sm:text-lg" : undefined}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className={`font-semibold tracking-tight text-stone-900 ${large ? "line-clamp-2 text-lg sm:text-xl" : "truncate"}`}
            >
              {creator.name}
            </h3>
            {creator.tier === "premium" ? (
              <span
                className={`shrink-0 rounded-full bg-primary font-bold uppercase tracking-wide text-stone-900 ring-1 ring-stone-900/10 ${large ? "px-2.5 py-1 text-[11px]" : "px-2 py-0.5 text-[10px]"}`}
              >
                Premium
              </span>
            ) : null}
          </div>
          <p
            className={`mt-1 text-stone-600 ${large ? "line-clamp-2 text-sm sm:text-base" : "truncate text-sm"}`}
          >
            {creator.city ?? "Tunisia"}
            {creator.niches[0] ? ` · ${creator.niches[0]}` : ""}
            {platform ? ` · ${platform}` : ""}
          </p>
          <div
            className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-stone-500 ${large ? "text-xs sm:text-sm" : "text-xs"}`}
          >
            {views ? <span>{views} views</span> : null}
            {eng ? <span>{eng}</span> : null}
            {creator.fromCoins != null ? (
              <span className="font-medium text-stone-700">from {creator.fromCoins} coins</span>
            ) : null}
          </div>
        </div>
        <div className={`shrink-0 text-right ${large ? "min-w-[3.5rem]" : ""}`}>
          <div className={`font-semibold tabular-nums text-stone-900 ${large ? "text-base sm:text-lg" : "text-sm"}`}>
            ★ {creator.ratingAvg}
          </div>
          <div className={`text-stone-500 ${large ? "text-xs sm:text-sm" : "text-[11px]"}`}>
            {creator.ratingCount} reviews
          </div>
        </div>
      </div>

      <div className={`flex flex-wrap gap-2 border-t border-stone-900/10 ${large ? "px-6 py-4 sm:px-7" : "px-5 py-3"}`}>
        {(creator.niches ?? []).slice(0, nicheLimit).map((n) => (
          <span
            key={n}
            className={`rounded-full border border-stone-900/10 bg-secondary/80 font-medium text-stone-700 ${large ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"}`}
          >
            {n}
          </span>
        ))}
      </div>

      {locked ? (
        <div
          className={`relative border-t border-stone-900/10 bg-gradient-to-t from-stone-900 via-stone-900/90 to-stone-900/40 ${large ? "px-6 py-5 sm:px-7" : "px-5 py-4"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-white">Unlock full profile & contact</p>
            <Link
              href="/auth/register"
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-xs font-semibold text-stone-900 ring-1 ring-white/20"
            >
              Create account
            </Link>
          </div>
        </div>
      ) : (
        <Link
          href={`/creators/${creator.id}`}
          className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
          aria-label={`Open ${creator.name} profile`}
        />
      )}
    </div>
  );
}
