import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { Withdrawal } from "@/models/Withdrawal";
import { Transaction } from "@/models/Transaction";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const items = await Withdrawal.find({ status: "REQUESTED" }).sort({ createdAt: 1 }).limit(200).lean();
    return Response.json({
      ok: true,
      withdrawals: items.map((w) => ({
        id: w._id.toString(),
        creatorUserId: w.creatorUserId.toString(),
        coins: w.coins,
        grossDT: w.grossDT,
        commissionDT: w.commissionDT,
        netDT: w.netDT,
        status: w.status,
        createdAt: w.createdAt,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const ProcessSchema = z.object({
  withdrawalId: z.string().min(1),
  action: z.enum(["process", "reject"]),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const body = ProcessSchema.parse(await req.json());
    const w = await Withdrawal.findById(body.withdrawalId);
    if (!w) throw new ApiError(404, "NOT_FOUND", "Withdrawal not found.");
    if (w.status !== "REQUESTED") throw new ApiError(409, "INVALID_STATUS", "Withdrawal already handled.");

    w.status = body.action === "process" ? "PROCESSED" : "REJECTED";
    w.processedBy = auth.sub as any;
    w.processedAt = new Date();
    await w.save();

    await Transaction.create({
      type: "WITHDRAWAL_PROCESSED",
      fromUserId: w.creatorUserId,
      coins: w.coins,
      dtEquivalent: w.netDT,
      metadata: { withdrawalId: w._id, action: body.action },
    });

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

