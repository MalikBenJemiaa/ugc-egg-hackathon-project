import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { User } from "@/models/User";

const UpdateSchema = z
  .object({
    name: z.string().trim().max(120).optional().or(z.literal("")),
    phoneNumber: z.string().trim().max(40).optional().or(z.literal("")),
    companyName: z.string().trim().max(120).optional().or(z.literal("")),
    city: z.string().trim().max(120).optional().or(z.literal("")),
    bio: z.string().trim().max(2000).optional().or(z.literal("")),
  })
  .strict();

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    const body = UpdateSchema.parse(await req.json());

    const update: Record<string, string> = {};
    if (body.name !== undefined) update.name = body.name || "";
    if (body.phoneNumber !== undefined) update.phoneNumber = body.phoneNumber || "";
    if (body.companyName !== undefined) update.companyName = body.companyName || "";
    if (body.city !== undefined) update.city = body.city || "";
    if (body.bio !== undefined) update.bio = body.bio || "";

    if (Object.keys(update).length === 0) {
      throw new ApiError(400, "NO_FIELDS", "Provide at least one field to update.");
    }

    const user = await User.findByIdAndUpdate(
      auth.sub,
      { $set: update },
      { new: true }
    ).lean();

    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found.");

    return Response.json({
      ok: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name ?? "",
        phoneNumber: user.phoneNumber ?? "",
        companyName: user.companyName ?? "",
        city: user.city ?? "",
        bio: user.bio ?? "",
      },
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
