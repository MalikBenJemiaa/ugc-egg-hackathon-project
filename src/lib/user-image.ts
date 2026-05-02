/** Normalize `User.image` for `<img src>` (same-origin path or absolute URL). */
export function publicUserImageSrc(image: string | null | undefined): string | null {
  if (image == null) return null;
  const s = String(image).trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/")) return s;
  return `/${s}`;
}
