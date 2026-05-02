import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export type AuthJwtPayload = {
  sub: string;
  role: "client" | "creator" | "admin";
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Missing JWT_SECRET in environment.");
  return secret;
}

export function signAuthToken(payload: AuthJwtPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as AuthJwtPayload;
}

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1];
}

