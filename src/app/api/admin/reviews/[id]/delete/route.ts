import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { Review } from "@/models/Review";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["admin"]);

    const { id } = await params;
    const review = await Review.findById(id);
    if (!review) throw new ApiError(404, "NOT_FOUND", "Review not found.");

    review.status = "deleted";
    await review.save();

    return Response.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}

