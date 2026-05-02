import type { Metadata } from "next";
import { DiscoveryFeed } from "@/components/DiscoveryFeed";

export const metadata: Metadata = {
  title: "Browse creators",
  description: "Filter Viral creators by niche and rating, then open a profile to unlock contact details and place an order.",
};

export default function CreatorsBrowsePage() {
  return (
    <div className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8 xl:px-12 2xl:px-16">
      <header className="mb-6 flex flex-col gap-2 sm:mb-8 sm:flex-row sm:items-end sm:justify-between lg:mb-10">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl lg:text-4xl">
            Browse creators
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Use niche and rating filters to narrow the list. Sign in to unlock full profiles and send orders.
          </p>
        </div>
      </header>
      <DiscoveryFeed layout="browse" />
    </div>
  );
}
