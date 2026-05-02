import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/require-auth";
import { toErrorResponse, ApiError } from "@/lib/api-errors";
import { CoinPackage } from "@/models/CoinPackage";
import { Wallet } from "@/models/Wallet";
import { Transaction } from "@/models/Transaction";

const TopupSchema = z.object({
  packageId: z.string().min(1),
  paymentProvider: z.enum(["konnect", "paymee"]).optional(),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    const body = TopupSchema.parse(await req.json());

    const pkg = await CoinPackage.findById(body.packageId);
    if (!pkg || !pkg.active) throw new ApiError(404, "PACKAGE_NOT_FOUND", "Coin package not found.");

    const creditCoins = pkg.coinsReceived + pkg.bonusCoins;

    const wallet = await Wallet.findOneAndUpdate(
      { userId: auth.sub },
      { $inc: { balanceCoins: creditCoins } },
      { new: true, upsert: true }
    );

    const metadata: Record<string, unknown> = {
      packageId: pkg._id,
      packageName: pkg.name,
    };
    if (body.paymentProvider) {
      metadata.paymentProvider = body.paymentProvider;
    }

    await Transaction.create({
      type: "TOPUP",
      toUserId: auth.sub,
      coins: creditCoins,
      dtEquivalent: pkg.dtPrice,
      metadata,
    });

    return Response.json({
      ok: true,
      wallet: { balanceCoins: wallet.balanceCoins },
      creditedCoins: creditCoins,
      dtPaid: pkg.dtPrice,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

