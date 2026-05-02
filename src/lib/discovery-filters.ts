/** Domain / niche options (Tunisia UGC marketplace). */
export const DISCOVERY_NICHES = [
  "Restaurant",
  "Food & Beverage",
  "Fashion & Clothes",
  "Coffee & Cafe",
  "Sport & Fitness",
  "Beauty & Skincare",
  "Tech & Electronics",
  "Travel",
  "Home Decor",
  "Health & Wellness",
  "Automotive",
  "Pets",
  "Other",
] as const;

export const DISCOVERY_LANGUAGES = [
  "Arabic",
  "French",
  "English",
  "Chinese",
  "Spanish",
  "German",
  "Other",
] as const;

export const DISCOVERY_CITIES = [
  "Tunis",
  "Ariana",
  "Ben Arous",
  "Manouba",
  "Nabeul",
  "Bizerte",
  "Béja",
  "Jendouba",
  "Le Kef",
  "Siliana",
  "Sousse",
  "Monastir",
  "Mahdia",
  "Sfax",
  "Kairouan",
  "Kasserine",
  "Sidi Bouzid",
  "Gafsa",
  "Tozeur",
  "Kebili",
  "Tataouine",
  "Médenine",
  "Gabès",
] as const;

/** Maps to API `content` query values (OR semantics when multiple selected). */
export const DISCOVERY_CONTENT_TYPES = [
  { id: "ugc_video", label: "Video UGC" },
  { id: "photo_static", label: "Photo / static post" },
  { id: "story_reel", label: "Story / Reel" },
  { id: "campaign_pack", label: "Full campaign pack" },
] as const;

export const DISCOVERY_AGE_PRESETS: ReadonlyArray<
  { id: ""; label: string } | { id: string; label: string; min: number; max: number }
> = [
  { id: "", label: "Any age" },
  { id: "18-24", label: "18–24", min: 18, max: 24 },
  { id: "25-34", label: "25–34", min: 25, max: 34 },
  { id: "35-44", label: "35–44", min: 35, max: 44 },
  { id: "45+", label: "45+", min: 45, max: 120 },
];

export const DISCOVERY_PLATFORM_PRESETS = [
  { id: "", label: "All platforms" },
  { id: "Instagram", label: "Instagram" },
  { id: "TikTok", label: "TikTok" },
  { id: "YouTube", label: "YouTube" },
  { id: "instagram_tiktok", label: "Instagram + TikTok" },
] as const;
