import { connectToDatabase } from "@/lib/mongodb";
import { toErrorResponse } from "@/lib/api-errors";
import { CreatorProfile } from "@/models/CreatorProfile";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { Review } from "@/models/Review";
import mongoose from "mongoose";

function strArrayParam(url: URL, key: string) {
  const values = url.searchParams
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((v) => v.trim())
    .filter(Boolean);
  return values.length ? values : null;
}

function numParam(url: URL, key: string) {
  const raw = url.searchParams.get(key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function contentTypeOrClauses(types: string[]): Record<string, unknown>[] {
  const ors: Record<string, unknown>[] = [];
  const set = new Set(types);
  if (set.has("ugc_video")) ors.push({ "pricing.baseUGCVideoCoins": { $gt: 0 } });
  if (set.has("photo_static")) {
    ors.push({
      $or: [
        { "pricing.postInstagramCoins": { $gt: 0 } },
        { "pricing.postTiktokCoins": { $gt: 0 } },
      ],
    });
  }
  if (set.has("story_reel")) ors.push({ "pricing.instagramStoryCoins": { $gt: 0 } });
  if (set.has("campaign_pack")) ors.push({ "pricing.campaignPackCoins": { $gt: 0 } });
  return ors;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);

    const niches = strArrayParam(url, "niche");
    const languages = strArrayParam(url, "language");
    const city = url.searchParams.get("city")?.trim() || null;
    const gender = url.searchParams.get("gender")?.trim() || null;
    const tiers = strArrayParam(url, "tier");

    const minRating = numParam(url, "minRating");
    const ageMin = numParam(url, "ageMin");
    const ageMax = numParam(url, "ageMax");
    const priceMin = numParam(url, "priceMin");
    const priceMax = numParam(url, "priceMax");

    const availableOnly = url.searchParams.get("availableOnly") !== "false";

    const platformPreset = url.searchParams.get("platform")?.trim() || "";
    const contentTypes = strArrayParam(url, "content");

    const match: Record<string, unknown> = {
      verifiedStatus: "approved",
    };
    if (availableOnly) match.availabilityStatus = "available";

    if (niches?.length) match.niches = { $in: niches };
    if (languages?.length) match.languages = { $in: languages };
    if (city) match.city = city;
    if (gender === "man" || gender === "woman") match.gender = gender;
    if (tiers?.length === 1 && (tiers[0] === "standard" || tiers[0] === "premium")) {
      match.tier = tiers[0];
    }

    if (ageMin !== null || ageMax !== null) {
      match.age = {} as Record<string, number>;
      if (ageMin !== null) (match.age as Record<string, number>).$gte = ageMin;
      if (ageMax !== null) (match.age as Record<string, number>).$lte = ageMax;
    }

    if (platformPreset === "instagram_tiktok") {
      match.platforms = { $all: ["Instagram", "TikTok"] };
    } else if (platformPreset && platformPreset !== "all") {
      match.platforms = platformPreset;
    }

    const contentOr = contentTypes?.length ? contentTypeOrClauses(contentTypes) : [];

    const pipeline: mongoose.PipelineStage[] = [{ $match: match }];
    if (contentOr.length) {
      pipeline.push({ $match: { $or: contentOr } });
    }

    pipeline.push(
      {
        $lookup: {
          from: Wallet.collection.name,
          localField: "userId",
          foreignField: "userId",
          as: "wallet",
        },
      },
      { $unwind: { path: "$wallet", preserveNullAndEmptyArrays: true } },
      { $match: { "wallet.balanceCoins": { $gt: 0 } } },
      {
        $addFields: {
          _floorPriceCoins: {
            $reduce: {
              input: [
                { $ifNull: ["$pricing.baseUGCVideoCoins", 0] },
                { $ifNull: ["$pricing.postInstagramCoins", 0] },
                { $ifNull: ["$pricing.postTiktokCoins", 0] },
                { $ifNull: ["$pricing.instagramStoryCoins", 0] },
                { $ifNull: ["$pricing.campaignPackCoins", 0] },
              ],
              initialValue: null,
              in: {
                $cond: [
                  { $lte: ["$$this", 0] },
                  "$$value",
                  {
                    $cond: [
                      { $or: [{ $eq: ["$$value", null] }, { $lt: ["$$this", "$$value"] }] },
                      "$$this",
                      "$$value",
                    ],
                  },
                ],
              },
            },
          },
        },
      }
    );

    const priceMatch: Record<string, unknown> = {};
    if (priceMin !== null) priceMatch.$gte = priceMin;
    if (priceMax !== null) priceMatch.$lte = priceMax;
    if (Object.keys(priceMatch).length) {
      pipeline.push({
        $match: {
          _floorPriceCoins: { $ne: null, ...priceMatch },
        },
      });
    }

    pipeline.push(
      {
        $lookup: {
          from: User.collection.name,
          localField: "userId",
          foreignField: "_id",
          as: "_account",
        },
      },
      { $unwind: { path: "$_account", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: Review.collection.name,
          let: { creatorUserId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$creatorUserId", "$$creatorUserId"] }, { $eq: ["$status", "active"] }],
                },
              },
            },
            { $group: { _id: null, avgStars: { $avg: "$stars" }, count: { $sum: 1 } } },
          ],
          as: "rating",
        },
      },
      { $unwind: { path: "$rating", preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          ratingAvg: { $ifNull: ["$rating.avgStars", 0] },
          ratingCount: { $ifNull: ["$rating.count", 0] },
        },
      }
    );

    if (minRating !== null) {
      pipeline.push({ $match: { ratingAvg: { $gte: minRating } } });
    }

    pipeline.push(
      { $sort: { tier: -1, ratingAvg: -1, ratingCount: -1, createdAt: -1 } },
      { $limit: 60 },
      {
        $project: {
          userId: 1,
          name: 1,
          city: 1,
          gender: 1,
          age: 1,
          niches: 1,
          languages: 1,
          platforms: 1,
          tier: 1,
          availabilityStatus: 1,
          returnDate: 1,
          ratingAvg: 1,
          ratingCount: 1,
          pricing: 1,
          avgViews: 1,
          avgEngagementRate: 1,
          userImage: { $ifNull: ["$_account.image", null] },
        },
      }
    );

    function floorPriceCoins(pricing: unknown): number | null {
      if (!pricing || typeof pricing !== "object") return null;
      const r = pricing as Record<string, unknown>;
      const vals = Object.values(r).filter((v): v is number => typeof v === "number" && v > 0);
      return vals.length ? Math.min(...vals) : null;
    }

    const results = await CreatorProfile.aggregate(pipeline);
    const creators = results.map((c: Record<string, unknown>) => {
      const rawImg = c.userImage;
      const image = typeof rawImg === "string" && rawImg.trim() ? rawImg.trim() : null;
      return {
        id: (c.userId as { toString(): string }).toString(),
        name: c.name as string,
        image,
        city: (c.city as string | null) ?? null,
        gender: (c.gender as string | null) ?? null,
        age: (c.age as number | null) ?? null,
        niches: (c.niches as string[]) ?? [],
        languages: (c.languages as string[]) ?? [],
        platforms: (c.platforms as string[]) ?? [],
        tier: c.tier as string,
        availabilityStatus: c.availabilityStatus as string,
        returnDate: c.returnDate ?? null,
        ratingAvg: Math.round(((c.ratingAvg as number) ?? 0) * 10) / 10,
        ratingCount: (c.ratingCount as number) ?? 0,
        pricing: c.pricing ?? null,
        avgViews: typeof c.avgViews === "number" ? c.avgViews : null,
        avgEngagementRate: typeof c.avgEngagementRate === "number" ? c.avgEngagementRate : null,
        fromCoins: floorPriceCoins(c.pricing),
      };
    });

    return Response.json({
      ok: true,
      premium: creators.filter((c) => c.tier === "premium"),
      standard: creators.filter((c) => c.tier !== "premium"),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
