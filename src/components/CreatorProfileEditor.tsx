"use client";

import { useRef, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";
import { DISCOVERY_CITIES, DISCOVERY_LANGUAGES, DISCOVERY_NICHES } from "@/lib/discovery-filters";

const PLATFORM_OPTIONS = ["Instagram", "TikTok", "YouTube"] as const;

type PricingState = {
  baseUGCVideoCoins: number;
  postInstagramCoins: number;
  postTiktokCoins: number;
  instagramStoryCoins: number;
  campaignPackCoins: number;
};

type PlatformLinksState = {
  instagram: string;
  tiktok: string;
  youtube: string;
};

export type CreatorEditorInitial = {
  name: string;
  image: string | null;
  phoneNumber: string;
  gender: "man" | "woman" | "" | null;
  age: number | null;
  city: string;
  bio: string;
  niches: string[];
  languages: string[];
  platforms: string[];
  platformLinks: PlatformLinksState;
  pricing: PricingState;
};

type Props = {
  token: string;
  initial: CreatorEditorInitial;
  onSaved: () => void;
};

function toggleInList(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function asNonNegativeInt(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function CreatorProfileEditor({ token, initial, onSaved }: Props) {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState(initial.name);
  const [imageSrc, setImageSrc] = useState<string | null>(initial.image);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber);
  const [gender, setGender] = useState<string>(initial.gender ?? "");
  const [age, setAge] = useState<string>(initial.age != null ? String(initial.age) : "");
  const [city, setCity] = useState<string>(initial.city);
  const [bio, setBio] = useState<string>(initial.bio);
  const [niches, setNiches] = useState<string[]>(initial.niches);
  const [languages, setLanguages] = useState<string[]>(initial.languages);
  const [platforms, setPlatforms] = useState<string[]>(initial.platforms);
  const [platformLinks, setPlatformLinks] = useState<PlatformLinksState>(initial.platformLinks);
  const [pricing, setPricing] = useState<PricingState>(initial.pricing);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function setPricingField(field: keyof PricingState, value: string) {
    setPricing((prev) => ({ ...prev, [field]: asNonNegativeInt(value) }));
  }

  async function handleImagePick(file: File) {
    setErr(null);
    setMsg(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setErr(json?.message ?? "Upload failed.");
        return;
      }
      setImageSrc(json.image);
      setMsg("Profile picture updated.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      const ageNum = age.trim() === "" ? null : Number(age);
      if (ageNum !== null && (!Number.isFinite(ageNum) || ageNum < 13 || ageNum > 120)) {
        setErr("Age must be between 13 and 120.");
        return;
      }

      const body = {
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        gender: gender === "" ? "" : (gender as "man" | "woman"),
        age: ageNum,
        city: city.trim(),
        bio: bio.trim(),
        niches,
        languages,
        platforms,
        platformLinks: {
          instagram: platformLinks.instagram.trim(),
          tiktok: platformLinks.tiktok.trim(),
          youtube: platformLinks.youtube.trim(),
        },
        pricing,
      };

      const res = await fetch("/api/creator/profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setErr(json?.message ?? "Failed to save profile.");
        return;
      }
      setMsg("Profile saved.");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-full border border-stone-900/12 bg-surface-elevated px-5 text-sm font-medium text-stone-800 shadow-sm transition hover:border-primary/40"
      >
        Edit profile
      </button>
    );
  }

  const checkboxClass =
    "h-4 w-4 shrink-0 cursor-pointer rounded border-stone-900/25 text-primary accent-primary focus:ring-primary/40";

  return (
    <div className="rounded-3xl border border-stone-900/10 bg-surface-elevated p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Edit your profile</h2>
          <p className="mt-1 text-sm text-stone-600">
            Changes go live immediately. Some fields (name, niches) feed discovery filters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full border border-stone-900/12 bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-stone-800"
        >
          Close
        </button>
      </div>

      {err ? (
        <div className="mt-4 rounded-2xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
          {err}
        </div>
      ) : null}
      {msg ? (
        <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900">
          {msg}
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-3">
          <UserAvatar
            name={name || initial.name}
            image={imageSrc}
            initialsTextClassName="text-xl"
            className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary/35 to-accent-warm/25 ring-1 ring-stone-900/10"
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImagePick(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-stone-900 px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          <p className="text-center text-[11px] text-stone-500">JPG, PNG, WEBP or GIF · up to 5 MB</p>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Display name</span>
              <input
                type="text"
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Phone number</span>
              <input
                type="tel"
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+216 …"
                maxLength={40}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Gender</span>
              <select
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="man">Man</option>
                <option value="woman">Woman</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Age</span>
              <input
                type="number"
                inputMode="numeric"
                min={13}
                max={120}
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">City</span>
              <select
                className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">Choose a city</option>
                {DISCOVERY_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Bio</span>
            <textarea
              className="mt-1.5 w-full rounded-xl border border-stone-900/12 bg-secondary/40 px-3 py-2.5 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary/40"
              value={bio}
              rows={4}
              maxLength={2000}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What you film, who you film for, signature deliverables…"
            />
            <span className="mt-1 block text-right text-[11px] tabular-nums text-stone-500">
              {bio.length}/2000
            </span>
          </label>

          <fieldset className="rounded-2xl border border-stone-900/10 bg-secondary/30 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Focus niches</legend>
            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
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
          </fieldset>

          <fieldset className="rounded-2xl border border-stone-900/10 bg-secondary/30 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Languages</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {DISCOVERY_LANGUAGES.map((lang) => (
                <label key={lang} className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
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
          </fieldset>

          <fieldset className="rounded-2xl border border-stone-900/10 bg-secondary/30 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Platforms</legend>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
              {PLATFORM_OPTIONS.map((p) => (
                <label key={p} className="flex cursor-pointer items-center gap-2 text-sm text-stone-800">
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={platforms.includes(p)}
                    onChange={() => setPlatforms((prev) => toggleInList(prev, p))}
                  />
                  {p}
                </label>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-[11px] font-medium text-stone-500">Instagram URL</span>
                <input
                  type="url"
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={platformLinks.instagram}
                  onChange={(e) => setPlatformLinks((prev) => ({ ...prev, instagram: e.target.value }))}
                  placeholder="https://instagram.com/handle"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-stone-500">TikTok URL</span>
                <input
                  type="url"
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={platformLinks.tiktok}
                  onChange={(e) => setPlatformLinks((prev) => ({ ...prev, tiktok: e.target.value }))}
                  placeholder="https://tiktok.com/@handle"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-stone-500">YouTube URL</span>
                <input
                  type="url"
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  value={platformLinks.youtube}
                  onChange={(e) => setPlatformLinks((prev) => ({ ...prev, youtube: e.target.value }))}
                  placeholder="https://youtube.com/@handle"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border border-stone-900/10 bg-secondary/30 p-4">
            <legend className="px-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Rate card (coins)</legend>
            <p className="mt-1 px-2 text-xs text-stone-500">Set 0 to hide a line from your card. Buyers see lowest non-zero price.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-medium text-stone-500">UGC video</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                  value={pricing.baseUGCVideoCoins}
                  onChange={(e) => setPricingField("baseUGCVideoCoins", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-stone-500">Post on Instagram</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                  value={pricing.postInstagramCoins}
                  onChange={(e) => setPricingField("postInstagramCoins", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-stone-500">Post on TikTok</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                  value={pricing.postTiktokCoins}
                  onChange={(e) => setPricingField("postTiktokCoins", e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium text-stone-500">Instagram story</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                  value={pricing.instagramStoryCoins}
                  onChange={(e) => setPricingField("instagramStoryCoins", e.target.value)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-[11px] font-medium text-stone-500">Full campaign pack</span>
                <input
                  type="number"
                  min={0}
                  className="mt-1 w-full rounded-xl border border-stone-900/12 bg-surface-elevated px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/40"
                  value={pricing.campaignPackCoins}
                  onChange={(e) => setPricingField("campaignPackCoins", e.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-stone-900 shadow-md shadow-primary/20 ring-1 ring-stone-900/10 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-stone-900/12 px-6 text-sm font-medium text-stone-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
