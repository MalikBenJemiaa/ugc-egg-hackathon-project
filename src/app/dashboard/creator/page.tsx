"use client";

import { useEffect } from "react";
import { getToken } from "@/lib/token-storage";

export default function CreatorDashboardRedirect() {
  useEffect(() => {
    const token = getToken();
    if (!token) {
      window.location.replace("/auth/login");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json?.ok && json.user?.id) {
          window.location.replace(`/creators/${encodeURIComponent(json.user.id)}`);
          return;
        }
      } catch {
        // fall through to login below
      }
      window.location.replace("/auth/login");
    })();
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-16 text-sm text-stone-600 sm:px-6">
      <span className="h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
      Opening your studio…
    </div>
  );
}
