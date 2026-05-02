"use client";

import { useState } from "react";
import { initialsFromName } from "@/lib/format";
import { publicUserImageSrc } from "@/lib/user-image";

type Props = {
  /** Display name (creator profile name or email local-part for header). */
  name: string;
  image?: string | null;
  className?: string;
  /** Tailwind text size for initials fallback (e.g. `text-xl`). */
  initialsTextClassName?: string;
};

const DEFAULT_FRAME =
  "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-primary/30 to-accent-warm/20 ring-1 ring-stone-900/10";

export function UserAvatar({ name, image, className, initialsTextClassName }: Props) {
  const src = publicUserImageSrc(image);
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src && !failed);

  return (
    <div className={className ?? DEFAULT_FRAME}>
      {showPhoto ? (
        <img
          src={src!}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center font-bold text-stone-900 ${initialsTextClassName ?? "text-sm"}`}
        >
          {initialsFromName(name)}
        </span>
      )}
    </div>
  );
}
