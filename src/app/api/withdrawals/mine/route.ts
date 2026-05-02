import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { toErrorResponse } from "@/lib/api-errors";
import { Withdrawal } from "@/models/Withdrawal";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["creator"]);

    const withdrawals = await Withdrawal.find({ creatorUserId: auth.sub }).sort({ createdAt: -1 }).limit(50).lean();
    return Response.json({
      ok: true,
      withdrawals: withdrawals.map((w) => ({
        id: w._id.toString(),
        coins: w.coins,
        grossDT: w.grossDT,
        commissionDT: w.commissionDT,
        netDT: w.netDT,
        status: w.status,
        createdAt: w.createdAt,
        processedAt: w.processedAt ?? null,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

