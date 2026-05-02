import { connectToDatabase } from "@/lib/mongodb";
import { CoinPackage } from "@/models/CoinPackage";
import { toErrorResponse } from "@/lib/api-errors";

const DEFAULT_PACKAGES = [
  { name: "Starter", dtPrice: 5, coinsReceived: 50, bonusCoins: 0, active: true },
  { name: "Basic", dtPrice: 10, coinsReceived: 110, bonusCoins: 10, active: true },
  { name: "Pro", dtPrice: 25, coinsReceived: 290, bonusCoins: 40, active: true },
  { name: "Agency", dtPrice: 50, coinsReceived: 620, bonusCoins: 120, active: true },
];

export async function GET() {
  try {
    await connectToDatabase();

    const count = await CoinPackage.countDocuments();
    if (count === 0) {
      await CoinPackage.insertMany(DEFAULT_PACKAGES, { ordered: false });
    }

    const packages = await CoinPackage.find({ active: true }).sort({ dtPrice: 1 }).lean();
    return Response.json({
      ok: true,
      packages: packages.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        dtPrice: p.dtPrice,
        coinsReceived: p.coinsReceived,
        bonusCoins: p.bonusCoins,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

