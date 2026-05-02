import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const users = await User.find().sort({ createdAt: -1 }).limit(200).lean();
    return Response.json({
      ok: true,
      users: users.map((u) => ({
        id: u._id.toString(),
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const UpdateUserSchema = z.object({
  userId: z.string().min(1),
  status: z.enum(["active", "suspended"]),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const body = UpdateUserSchema.parse(await req.json());
    const user = await User.findById(body.userId);
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");
    user.status = body.status;
    await user.save();
    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

