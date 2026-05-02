import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { CreatorProfile } from "@/models/CreatorProfile";
import { ProfileVisit } from "@/models/ProfileVisit";
import { Review } from "@/models/Review";
import { User } from "@/models/User";
import { hasClientCompletedTopup } from "@/lib/client-wallet-funded";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    const { id } = await params;

    const profile = await CreatorProfile.findOne({ userId: id }).lean();
    if (!profile) throw new ApiError(404, "NOT_FOUND", "Creator not found.");

    const account = await User.findById(profile.userId).select("image").lean();
    const image =
      typeof account?.image === "string" && account.image.trim() ? account.image.trim() : null;

    const viewingOwnProfile = auth.sub === id && auth.role === "creator";
    const isAdmin = auth.role === "admin";

    let unlockedByClient = false;
    if (!viewingOwnProfile && auth.role === "client") {
      const funded = await hasClientCompletedTopup(auth.sub);
      if (!funded) {
        throw new ApiError(
          402,
          "WALLET_NOT_FUNDED",
          "Add coins through Konnect or Paymee before viewing creator profiles."
        );
      }
      unlockedByClient = !!(await ProfileVisit.findOne({ clientUserId: auth.sub, creatorUserId: id }).lean());
      if (!unlockedByClient && !isAdmin) {
        throw new ApiError(
          403,
          "PROFILE_LOCKED",
          "Creator details unlock after the in-app visit step completes."
        );
      }
    } else if (!viewingOwnProfile && !isAdmin) {
      unlockedByClient = !!(await ProfileVisit.findOne({ clientUserId: auth.sub, creatorUserId: id }).lean());
    }

    const unlocked = viewingOwnProfile || unlockedByClient || isAdmin;

    // If creator is unavailable, only previously-unlocked clients (or the creator themself) can access.
    if (profile.availabilityStatus !== "available" && !unlocked) {
      throw new ApiError(404, "NOT_FOUND", "Creator not found.");
    }

    const reviews = await Review.find({ creatorUserId: id, status: "active" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const ratingCount = reviews.length;
    const ratingAvg = ratingCount ? Math.round((reviews.reduce((s, r) => s + r.stars, 0) / ratingCount) * 10) / 10 : 0;

    return Response.json({
      ok: true,
      unlocked,
      creator: {
        id: profile.userId.toString(),
        name: profile.name,
        image,
        phoneNumber: unlocked ? profile.phoneNumber ?? null : null,
        city: profile.city ?? null,
        gender: profile.gender ?? null,
        age: profile.age ?? null,
        niches: profile.niches ?? [],
        languages: profile.languages ?? [],
        platforms: profile.platforms ?? [],
        platformLinks: profile.platformLinks ?? {},
        bio: profile.bio ?? "",
        portfolioMedia: profile.portfolioMedia ?? [],
        pricing: profile.pricing ?? null,
        tier: profile.tier,
        availabilityStatus: profile.availabilityStatus,
        returnDate: profile.returnDate ?? null,
        verifiedStatus: profile.verifiedStatus,
        ratingAvg,
        ratingCount,
      },
      reviews: reviews.map((r) => ({
        id: r._id.toString(),
        stars: r.stars,
        text: r.text ?? "",
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

