import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { CreatorProfile } from "@/models/CreatorProfile";
import { signAuthToken } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";

const RegisterSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  role: z.enum(["client", "creator"]),
});

export async function POST(req: Request) {
  try {
    const body = RegisterSchema.parse(await req.json());
    await connectToDatabase();

    const existing = await User.findOne({ email: body.email }).lean();
    if (existing) throw new ApiError(409, "EMAIL_TAKEN", "Email is already registered.");

    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await User.create({
      email: body.email,
      passwordHash,
      role: body.role,
      status: "active",
    });

    await Wallet.create({ userId: user._id, balanceCoins: 0 });
    if (body.role === "creator") {
      await CreatorProfile.create({
        userId: user._id,
        name: body.email.split("@")[0] ?? "Creator",
        verifiedStatus: "pending",
        availabilityStatus: "available",
        tier: "standard",
        pricing: {
          baseUGCVideoCoins: 0,
          postInstagramCoins: 0,
          postTiktokCoins: 0,
          instagramStoryCoins: 0,
          campaignPackCoins: 0,
        },
      });
    }

    const token = signAuthToken({ sub: user._id.toString(), role: user.role });
    const image =
      typeof user.image === "string" && user.image.trim() ? user.image.trim() : null;
    return Response.json(
      {
        ok: true,
        token,
        user: { id: user._id.toString(), email: user.email, role: user.role, image },
      },
      { status: 201 }
    );
  } catch (err) {
    return toErrorResponse(err);
  }
}

