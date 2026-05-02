import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { CoinPackage } from "@/models/CoinPackage";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const packages = await CoinPackage.find().sort({ dtPrice: 1 }).lean();
    return Response.json({
      ok: true,
      packages: packages.map((p) => ({
        id: p._id.toString(),
        name: p.name,
        dtPrice: p.dtPrice,
        coinsReceived: p.coinsReceived,
        bonusCoins: p.bonusCoins,
        active: p.active,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const UpsertSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1).max(50),
  dtPrice: z.number().min(0),
  coinsReceived: z.number().int().min(0),
  bonusCoins: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const body = UpsertSchema.parse(await req.json());
    if (body.id) {
      const updated = await CoinPackage.findByIdAndUpdate(
        body.id,
        {
          name: body.name,
          dtPrice: body.dtPrice,
          coinsReceived: body.coinsReceived,
          bonusCoins: body.bonusCoins,
          active: body.active,
        },
        { new: true }
      );
      if (!updated) throw new ApiError(404, "NOT_FOUND", "Package not found.");
      return Response.json({ ok: true, id: updated._id.toString() });
    }

    const created = await CoinPackage.create({
      name: body.name,
      dtPrice: body.dtPrice,
      coinsReceived: body.coinsReceived,
      bonusCoins: body.bonusCoins,
      active: body.active,
    });
    return Response.json({ ok: true, id: created._id.toString() }, { status: 201 });
  } catch (err) {
    if ((err as any)?.code === 11000) {
      return toErrorResponse(new ApiError(409, "DUPLICATE", "Package name already exists."));
    }
    return toErrorResponse(err);
  }
}

