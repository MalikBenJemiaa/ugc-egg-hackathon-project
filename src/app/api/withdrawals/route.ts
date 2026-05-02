import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { Wallet } from "@/models/Wallet";
import { Withdrawal } from "@/models/Withdrawal";
import { Transaction } from "@/models/Transaction";
import { withdrawalNetDtFromCoins } from "@/lib/coins";

const CreateWithdrawalSchema = z.object({
  coins: z.number().int().positive(),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["creator"]);

    const body = CreateWithdrawalSchema.parse(await req.json());
    const wallet = await Wallet.findOne({ userId: auth.sub });
    if (!wallet || wallet.balanceCoins < body.coins) throw new ApiError(402, "LOW_BALANCE", "Not enough coins.");

    const { grossDT, commissionDT, netDT } = withdrawalNetDtFromCoins(body.coins, 0.1);

    // Deduct coins at request time so coins can't be requested twice.
    wallet.balanceCoins -= body.coins;
    await wallet.save();

    const withdrawal = await Withdrawal.create({
      creatorUserId: auth.sub,
      coins: body.coins,
      grossDT,
      commissionDT,
      netDT,
      status: "REQUESTED",
    });

    await Transaction.create({
      type: "WITHDRAWAL_REQUEST",
      fromUserId: auth.sub,
      coins: body.coins,
      dtEquivalent: grossDT,
      metadata: { commissionDT, netDT, withdrawalId: withdrawal._id },
    });

    return Response.json({
      ok: true,
      withdrawal: {
        id: withdrawal._id.toString(),
        coins: withdrawal.coins,
        grossDT,
        commissionDT,
        netDT,
        status: withdrawal.status,
      },
      wallet: { balanceCoins: wallet.balanceCoins },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

