import { z } from "zod";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User } from "@/models/User";
import { signAuthToken } from "@/lib/auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";

const LoginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  try {
    const body = LoginSchema.parse(await req.json());
    await connectToDatabase();

    const user = await User.findOne({ email: body.email });
    if (!user) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    if (user.status !== "active") throw new ApiError(403, "ACCOUNT_DISABLED", "Account is not active.");

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password.");

    const token = signAuthToken({ sub: user._id.toString(), role: user.role });
    const image =
      typeof user.image === "string" && user.image.trim() ? user.image.trim() : null;
    return Response.json({
      ok: true,
      token,
      user: { id: user._id.toString(), email: user.email, role: user.role, image },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

