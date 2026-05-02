import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { CreatorProfile } from "@/models/CreatorProfile";
import { Wallet } from "@/models/Wallet";
import { ProfileVisit } from "@/models/ProfileVisit";
import { Transaction } from "@/models/Transaction";
import { coinsToDt } from "@/lib/coins";
import { hasClientCompletedTopup } from "@/lib/client-wallet-funded";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    const { id } = await params;

    const creator = await CreatorProfile.findOne({ userId: id }).lean();
    if (!creator) throw new ApiError(404, "NOT_FOUND", "Creator not found.");

    // Creators opening their own public profile: no unlock debit, not a client visit.
    if (auth.sub === id && auth.role === "creator") {
      return Response.json({ ok: true, deducted: 0 });
    }

    requireRole(auth, ["client"]);

    const funded = await hasClientCompletedTopup(auth.sub);
    if (!funded) {
      throw new ApiError(
        402,
        "WALLET_NOT_FUNDED",
        "Add coins through Konnect or Paymee before browsing creator profiles."
      );
    }

    if (creator.availabilityStatus !== "available") {
      throw new ApiError(409, "CREATOR_UNAVAILABLE", "Creator is currently unavailable.");
    }

    const already = await ProfileVisit.findOne({ clientUserId: auth.sub, creatorUserId: id }).lean();
    if (already) return Response.json({ ok: true, deducted: 0 });

    const wallet = await Wallet.findOne({ userId: auth.sub });
    if (!wallet || wallet.balanceCoins < 1) {
      throw new ApiError(402, "LOW_BALANCE", "Not enough coins to visit this profile.");
    }

    // Debit 1 coin and create the visit record (unique index makes this idempotent under race).
    wallet.balanceCoins -= 1;
    await wallet.save();

    try {
      await ProfileVisit.create({ clientUserId: auth.sub, creatorUserId: id });
    } catch (e: any) {
      // Duplicate key: someone else created it concurrently; refund the coin to keep consistent.
      if (e?.code === 11000) {
        await Wallet.updateOne({ userId: auth.sub }, { $inc: { balanceCoins: 1 } });
        return Response.json({ ok: true, deducted: 0 });
      }
      throw e;
    }

    // Credit the visit fee to the creator's wallet (upsert in case it was never seeded).
    await Wallet.updateOne(
      { userId: id },
      { $inc: { balanceCoins: 1 }, $setOnInsert: { userId: id } },
      { upsert: true }
    );

    await Transaction.create({
      type: "PROFILE_VISIT_DEBIT",
      fromUserId: auth.sub,
      toUserId: id,
      coins: 1,
      dtEquivalent: coinsToDt(1),
      metadata: { reason: "first_profile_visit" },
    });

    return Response.json({
      ok: true,
      deducted: 1,
      wallet: { balanceCoins: wallet.balanceCoins },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

