import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { CreatorProfile } from "@/models/CreatorProfile";

const AvailabilitySchema = z.object({
  status: z.enum(["available", "unavailable"]),
  returnDate: z.string().datetime().optional().nullable(),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["creator"]);
    const body = AvailabilitySchema.parse(await req.json());

    const update: any = {
      availabilityStatus: body.status,
      returnDate: body.status === "unavailable" && body.returnDate ? new Date(body.returnDate) : null,
    };

    const profile = await CreatorProfile.findOneAndUpdate({ userId: auth.sub }, update, { new: true });
    if (!profile) throw new ApiError(404, "NOT_FOUND", "Creator profile not found.");

    return Response.json({
      ok: true,
      availabilityStatus: profile.availabilityStatus,
      returnDate: profile.returnDate ?? null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

