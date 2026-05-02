import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { CreatorProfile } from "@/models/CreatorProfile";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const pending = await CreatorProfile.find({ verifiedStatus: { $in: ["pending", "changes_requested"] } })
      .sort({ createdAt: 1 })
      .limit(100)
      .lean();

    return Response.json({
      ok: true,
      creators: pending.map((c) => ({
        userId: c.userId.toString(),
        name: c.name,
        tier: c.tier,
        verifiedStatus: c.verifiedStatus,
        availabilityStatus: c.availabilityStatus,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

const VerifySchema = z.object({
  creatorUserId: z.string().min(1),
  action: z.enum(["approve", "request_changes", "reject"]),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const body = VerifySchema.parse(await req.json());
    const profile = await CreatorProfile.findOne({ userId: body.creatorUserId });
    if (!profile) throw new ApiError(404, "NOT_FOUND", "Creator profile not found.");

    profile.verifiedStatus =
      body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : "changes_requested";
    await profile.save();

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

