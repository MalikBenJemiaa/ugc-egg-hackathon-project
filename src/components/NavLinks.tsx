"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken } from "@/lib/token-storage";

type Role = "client" | "creator" | "admin";

type MeResponse =
  | { ok: true; user: { role: Role } }
  | { ok: false; code: string; message: string };

function discoveryLinkFor(role: Role | null) {
  if (role === "client") return { href: "/creators", label: "All creators" };
  if (role === "creator") return { href: "/brands", label: "All brands" };
  return { href: "/about", label: "Our creators" };
}

export function NavLinks() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setRole(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as MeResponse;
        if (!cancelled) setRole(data.ok ? data.user.role : null);
      } catch {
        if (!cancelled) setRole(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const discovery = discoveryLinkFor(role);
  const links = [
    { href: "/", label: "Home" },
    discovery,
    { href: "/contact", label: "Contact" },
  ];

  return (
    <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2" aria-label="Primary">
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={
              active
                ? "px-3 py-1.5 text-stone-900 underline decoration-primary decoration-2 underline-offset-8"
                : "px-3 py-1.5 text-stone-600 transition hover:text-stone-900"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
