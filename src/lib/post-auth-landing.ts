export type PostAuthUser = { id: string; role: string };

/** Where to send the user immediately after login or registration. */
export function postAuthLandingHref(user: PostAuthUser): string {
  if (user.role === "creator") return `/creators/${encodeURIComponent(user.id)}`;
  if (user.role === "admin") return "/admin";
  return "/creators";
}
