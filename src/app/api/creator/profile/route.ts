import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { CreatorProfile } from "@/models/CreatorProfile";

const PricingSchema = z
  .object({
    baseUGCVideoCoins: z.number().int().min(0).max(100000).optional(),
    postInstagramCoins: z.number().int().min(0).max(100000).optional(),
    postTiktokCoins: z.number().int().min(0).max(100000).optional(),
    instagramStoryCoins: z.number().int().min(0).max(100000).optional(),
    campaignPackCoins: z.number().int().min(0).max(100000).optional(),
  })
  .strict();

const PlatformLinksSchema = z
  .object({
    instagram: z.string().url().max(500).optional().or(z.literal("")),
    tiktok: z.string().url().max(500).optional().or(z.literal("")),
    youtube: z.string().url().max(500).optional().or(z.literal("")),
  })
  .strict();

const UpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phoneNumber: z.string().trim().max(40).optional().or(z.literal("")),
    gender: z.enum(["man", "woman"]).optional().or(z.literal("")),
    age: z.number().int().min(13).max(120).nullable().optional(),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    bio: z.string().trim().max(2000).optional().or(z.literal("")),
    niches: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    languages: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    platforms: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    platformLinks: PlatformLinksSchema.optional(),
    pricing: PricingSchema.optional(),
  })
  .strict();

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["creator"]);
    const body = UpdateSchema.parse(await req.json());

    const update: Record<string, unknown> = {};

    if (body.name !== undefined) update.name = body.name;
    if (body.phoneNumber !== undefined) update.phoneNumber = body.phoneNumber || "";
    if (body.gender !== undefined) update.gender = body.gender === "" ? null : body.gender;
    if (body.age !== undefined) update.age = body.age ?? null;
    if (body.city !== undefined) update.city = body.city || "";
    if (body.bio !== undefined) update.bio = body.bio || "";
    if (body.niches !== undefined) update.niches = Array.from(new Set(body.niches));
    if (body.languages !== undefined) update.languages = Array.from(new Set(body.languages));
    if (body.platforms !== undefined) update.platforms = Array.from(new Set(body.platforms));
    if (body.platformLinks !== undefined) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(body.platformLinks)) {
        if (typeof v === "string" && v.trim()) cleaned[k] = v.trim();
      }
      update.platformLinks = cleaned;
    }

    if (body.pricing !== undefined) {
      const setFields: Record<string, number> = {};
      for (const [k, v] of Object.entries(body.pricing)) {
        if (typeof v === "number") setFields[`pricing.${k}`] = v;
      }
      Object.assign(update, setFields);
    }

    if (Object.keys(update).length === 0) {
      throw new ApiError(400, "NO_FIELDS", "Provide at least one field to update.");
    }

    const profile = await CreatorProfile.findOneAndUpdate(
      { userId: auth.sub },
      { $set: update },
      { new: true }
    ).lean();

    if (!profile) throw new ApiError(404, "NOT_FOUND", "Creator profile not found.");

    return Response.json({
      ok: true,
      profile: {
        name: profile.name,
        phoneNumber: profile.phoneNumber ?? "",
        gender: profile.gender ?? null,
        age: profile.age ?? null,
        city: profile.city ?? "",
        bio: profile.bio ?? "",
        niches: profile.niches ?? [],
        languages: profile.languages ?? [],
        platforms: profile.platforms ?? [],
        platformLinks: profile.platformLinks ?? {},
        pricing: profile.pricing ?? null,
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
