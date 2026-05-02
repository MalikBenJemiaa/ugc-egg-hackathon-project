import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/require-auth";
import { toErrorResponse } from "@/lib/api-errors";
import { Review } from "@/models/Review";
import { CreatorProfile } from "@/models/CreatorProfile";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);

    const reviews = await Review.aggregate([
      {
        $match: {
          clientUserId: new mongoose.Types.ObjectId(auth.sub),
          status: "active",
        },
      },
      { $sort: { createdAt: -1 } },
      { $limit: 100 },
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
        $project: {
          stars: 1,
          text: 1,
          createdAt: 1,
          orderId: 1,
          creatorUserId: 1,
          creatorName: { $ifNull: ["$creatorProfile.name", null] },
          creatorImage: { $ifNull: ["$creatorAccount.image", null] },
        },
      },
    ]);

    return Response.json({
      ok: true,
      reviews: reviews.map((r: Record<string, unknown>) => {
        const rawImg = r.creatorImage;
        const image = typeof rawImg === "string" && rawImg.trim() ? rawImg.trim() : null;
        return {
          id: (r._id as { toString(): string }).toString(),
          stars: (r.stars as number) ?? 0,
          text: (r.text as string) ?? "",
          createdAt: r.createdAt as string,
          creatorUserId: (r.creatorUserId as { toString(): string }).toString(),
          creatorName: (r.creatorName as string | null) ?? null,
          creatorImage: image,
          orderId: (r.orderId as { toString(): string }).toString(),
        };
      }),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
