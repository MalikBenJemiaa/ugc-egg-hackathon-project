/** Static marketing copy — fictional brands for illustration. */
export const HOME_STATS = [
  { label: "Active creators", value: "180+", hint: "Verified & wallet-positive" },
  { label: "Cities covered", value: "12", hint: "From Tunis to Djerba" },
  { label: "Median reply", value: "24h", hint: "First response to briefs" },
] as const;

export const HOME_TESTIMONIALS = [
  {
    quote:
      "We ran a four-video sprint with two food creators in Tunis and Sousse. Footage was on-brand within one revision cycle.",
    name: "Selma K.",
    role: "Marketing lead, Dar El Marsa café (fictional)",
  },
  {
    quote:
      "Coins felt odd at first, then we realized how much cleaner approvals became. Finance sees every unlock in one ledger.",
    name: "Omar B.",
    role: "Brand manager, Skincare pop-up (fictional)",
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Discover",
    body: "Filter by niche, city, language, and rating. Preview locked cards until you are ready to invest a coin.",
  },
  {
    step: "02",
    title: "Unlock & brief",
    body: "Open full profiles, see pricing in coins and DT equivalents, then stack deliverables into a single order.",
  },
  {
    step: "03",
    title: "Deliver & review",
    body: "Creators ship assets inside the flow. Ratings build trust for the next campaign.",
  },
] as const;

export const NICHE_HIGHLIGHTS = [
  { title: "Food & hospitality", detail: "Menu drops, tasting rooms, delivery promos." },
  { title: "Beauty & retail", detail: "GRWM, unboxings, before/after with clear CTAs." },
  { title: "Tech & services", detail: "Explainer hooks, feature tours, founder stories." },
] as const;

export const ABOUT_TIMELINE = [
  { year: "2024", title: "Pilot in Greater Tunis", text: "First cohort of vetted creators and three anchor retail partners." },
  { year: "2025", title: "Coin wallet launch", text: "Unified unlock + order payments with transparent DT conversion." },
  { year: "2026", title: "Nationwide discovery", text: "City filters, bilingual briefs, and creator studio tools." },
] as const;

export const CONTACT_HOURS = "Sun–Thu, 9:00–18:00 (CET, Tunisia)";
export const CONTACT_ADDRESS = "Immeuble Le Belvédère, Av. Habib Bourguiba, 1000 Tunis";
export const CONTACT_RESPONSE_SLA = "We aim to reply within one business day for support, two for partnerships.";
