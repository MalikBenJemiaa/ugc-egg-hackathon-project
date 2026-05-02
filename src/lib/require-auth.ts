import { ApiError } from "@/lib/api-errors";
import { verifyAuthToken, type AuthJwtPayload } from "@/lib/auth";

export function requireAuth(req: Request): AuthJwtPayload {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1];
  if (!token) throw new ApiError(401, "UNAUTHENTICATED", "Missing Authorization header.");

  try {
    return verifyAuthToken(token);
  } catch {
    throw new ApiError(401, "UNAUTHENTICATED", "Invalid or expired token.");
  }
}

export function requireRole(payload: AuthJwtPayload, allowed: AuthJwtPayload["role"][]) {
  if (!allowed.includes(payload.role)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this resource.");
  }
}

