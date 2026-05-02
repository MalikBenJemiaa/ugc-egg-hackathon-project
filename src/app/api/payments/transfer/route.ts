import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { Wallet } from "@/models/Wallet";
import { Transaction } from "@/models/Transaction";
import { coinsToDt } from "@/lib/coins";

const TransferSchema = z.object({
  toUserId: z.string().min(1),
  coins: z.number().int().positive(),
  reason: z.string().min(1).max(200).optional(),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["client"]);

    const body = TransferSchema.parse(await req.json());
    if (body.toUserId === auth.sub) throw new ApiError(400, "INVALID_TRANSFER", "Cannot pay yourself.");

    const from = await Wallet.findOne({ userId: auth.sub });
    if (!from || from.balanceCoins < body.coins) throw new ApiError(402, "LOW_BALANCE", "Not enough coins.");

    await Wallet.updateOne({ userId: auth.sub }, { $inc: { balanceCoins: -body.coins } }, { upsert: true });
    await Wallet.updateOne({ userId: body.toUserId }, { $inc: { balanceCoins: body.coins } }, { upsert: true });

    await Transaction.create({
      type: "TRANSFER",
      fromUserId: auth.sub,
      toUserId: body.toUserId,
      coins: body.coins,
      dtEquivalent: coinsToDt(body.coins),
      metadata: { reason: body.reason ?? "order_payment" },
    });

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

