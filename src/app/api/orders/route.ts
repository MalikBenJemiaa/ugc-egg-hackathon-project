import mongoose from "mongoose";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { CreatorProfile } from "@/models/CreatorProfile";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";

const CreateOrderSchema = z.object({
  creatorUserId: z.string().min(1),
  options: z
    .array(
      z.enum([
        "baseUGCVideo",
        "postInstagram",
        "postTiktok",
        "instagramStory",
        "campaignPack",
      ])
    )
    .min(1),
});

function pricingForOption(pricing: any, option: string) {
  switch (option) {
    case "baseUGCVideo":
      return { key: option, label: "UGC Video (no posting)", coins: pricing.baseUGCVideoCoins ?? 0 };
    case "postInstagram":
      return { key: option, label: "Post on Instagram", coins: pricing.postInstagramCoins ?? 0 };
    case "postTiktok":
      return { key: option, label: "Post on TikTok", coins: pricing.postTiktokCoins ?? 0 };
    case "instagramStory":
      return { key: option, label: "Instagram Story", coins: pricing.instagramStoryCoins ?? 0 };
    case "campaignPack":
      return { key: option, label: "Campaign Pack", coins: pricing.campaignPackCoins ?? 0 };
    default:
      return null;
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["client"]);

    const body = CreateOrderSchema.parse(await req.json());

    const creator = await CreatorProfile.findOne({ userId: body.creatorUserId }).lean();
    if (!creator) throw new ApiError(404, "NOT_FOUND", "Creator not found.");
    if (creator.availabilityStatus !== "available") {
      throw new ApiError(409, "CREATOR_UNAVAILABLE", "Creator is unavailable.");
    }
    if (creator.verifiedStatus !== "approved") {
      throw new ApiError(409, "CREATOR_NOT_VERIFIED", "Creator is not verified yet.");
    }

    const pricing = creator.pricing ?? {};
    const unique = Array.from(new Set(body.options));
    if (!unique.includes("baseUGCVideo")) {
      throw new ApiError(400, "INVALID_ORDER", "UGC Video is required as a base service.");
    }

    const items = unique
      .map((o) => pricingForOption(pricing, o))
      .filter(Boolean) as { key: string; label: string; coins: number }[];

    const totalCoins = items.reduce((s, i) => s + (i.coins ?? 0), 0);
    if (totalCoins <= 0) throw new ApiError(400, "INVALID_ORDER", "Creator pricing is not set yet.");

    const wallet = await Wallet.findOne({ userId: auth.sub }).lean();
    const balanceCoins = wallet?.balanceCoins ?? 0;
    if (balanceCoins < totalCoins) {
      throw new ApiError(
        402,
        "LOW_BALANCE",
        `Insufficient coins. Order needs ${totalCoins}, wallet has ${balanceCoins}.`
      );
    }

    const order = await Order.create({
      clientUserId: auth.sub,
      creatorUserId: body.creatorUserId,
      items,
      totalCoins,
      status: "REQUESTED",
    });

    return Response.json({ ok: true, order: { id: order._id.toString(), totalCoins, status: order.status } }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);

    const match: Record<string, unknown> =
      auth.role === "creator"
        ? { creatorUserId: new mongoose.Types.ObjectId(auth.sub) }
        : auth.role === "client"
          ? { clientUserId: new mongoose.Types.ObjectId(auth.sub) }
          : {};

    const orders = await Order.aggregate([
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: CreatorProfile.collection.name,
          localField: "creatorUserId",
          foreignField: "userId",
          as: "creatorProfile",
        },
      },
      { $unwind: { path: "$creatorProfile", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: User.collection.name,
          localField: "creatorUserId",
          foreignField: "_id",
          as: "creatorAccount",
        },
      },
      { $unwind: { path: "$creatorAccount", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: User.collection.name,
          localField: "clientUserId",
          foreignField: "_id",
          as: "clientAccount",
        },
      },
      { $unwind: { path: "$clientAccount", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: Review.collection.name,
          let: { orderId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$orderId", "$$orderId"] },
                status: "active",
              },
            },
            { $limit: 1 },
          ],
          as: "review",
        },
      },
      { $unwind: { path: "$review", preserveNullAndEmptyArrays: true } },
    ]);

    return Response.json({
      ok: true,
      orders: orders.map((o: Record<string, unknown>) => {
        const creatorAccount = (o.creatorAccount ?? null) as {
          email?: string;
          image?: string | null;
          name?: string;
        } | null;
        const creatorProfile = (o.creatorProfile ?? null) as { name?: string } | null;
        const clientAccount = (o.clientAccount ?? null) as {
          email?: string;
          image?: string | null;
          name?: string;
        } | null;

        function trimOrNull(v: unknown): string | null {
          if (typeof v !== "string") return null;
          const s = v.trim();
          return s.length ? s : null;
        }
        function emailLocalPart(email: string | null) {
          if (!email) return null;
          const i = email.indexOf("@");
          return i > 0 ? email.slice(0, i) : email;
        }

        const creatorName =
          trimOrNull(creatorProfile?.name) ??
          trimOrNull(creatorAccount?.name) ??
          emailLocalPart(creatorAccount?.email ?? null);

        const clientName =
          trimOrNull(clientAccount?.name) ??
          emailLocalPart(clientAccount?.email ?? null);

        const reviewDoc = (o.review ?? null) as {
          _id?: { toString(): string };
          stars?: number;
          text?: string;
          createdAt?: Date | string;
        } | null;
        const review = reviewDoc
          ? {
              id: reviewDoc._id ? reviewDoc._id.toString() : null,
              stars: typeof reviewDoc.stars === "number" ? reviewDoc.stars : 0,
              text: typeof reviewDoc.text === "string" ? reviewDoc.text : "",
              createdAt: reviewDoc.createdAt ?? null,
            }
          : null;

        return {
          id: (o._id as { toString(): string }).toString(),
          clientUserId: (o.clientUserId as { toString(): string }).toString(),
          creatorUserId: (o.creatorUserId as { toString(): string }).toString(),
          items: o.items,
          totalCoins: o.totalCoins,
          status: o.status,
          createdAt: o.createdAt,
          creator: {
            id: (o.creatorUserId as { toString(): string }).toString(),
            name: creatorName,
            image: trimOrNull(creatorAccount?.image),
          },
          client: {
            id: (o.clientUserId as { toString(): string }).toString(),
            name: clientName,
            image: trimOrNull(clientAccount?.image),
          },
          review,
        };
      }),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

