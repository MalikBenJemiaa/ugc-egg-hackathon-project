import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/require-auth";
import { toErrorResponse } from "@/lib/api-errors";
import { Transaction } from "@/models/Transaction";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);

    const txs = await Transaction.find({
      $or: [{ fromUserId: auth.sub }, { toUserId: auth.sub }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return Response.json({
      ok: true,
      transactions: txs.map((t) => ({
        id: t._id.toString(),
        type: t.type,
        fromUserId: t.fromUserId?.toString() ?? null,
        toUserId: t.toUserId?.toString() ?? null,
        coins: t.coins,
        dtEquivalent: t.dtEquivalent,
        metadata: t.metadata ?? null,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

