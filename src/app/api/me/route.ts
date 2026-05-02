import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/require-auth";
import { toErrorResponse } from "@/lib/api-errors";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const payload = requireAuth(req);

    const user = await User.findById(payload.sub).lean();
    if (!user) return Response.json({ ok: false, code: "NOT_FOUND", message: "User not found." }, { status: 404 });

    const wallet = await Wallet.findOne({ userId: user._id }).lean();

    const image =
      typeof user.image === "string" && user.image.trim() ? user.image.trim() : null;

    return Response.json({
      ok: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.status,
        image,
        name: user.name ?? "",
        phoneNumber: user.phoneNumber ?? "",
        companyName: user.companyName ?? "",
        city: user.city ?? "",
        bio: user.bio ?? "",
        createdAt: user.createdAt,
      },
      wallet: { balanceCoins: wallet?.balanceCoins ?? 0 },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

