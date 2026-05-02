import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { Order } from "@/models/Order";
import { Review } from "@/models/Review";

const CreateReviewSchema = z.object({
  orderId: z.string().min(1),
  stars: z.number().int().min(1).max(5),
  text: z.string().max(4000).optional().default(""),
});

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    requireRole(auth, ["client"]);

    const body = CreateReviewSchema.parse(await req.json());
    const order = await Order.findById(body.orderId).lean();
    if (!order) throw new ApiError(404, "NOT_FOUND", "Order not found.");
    if (order.clientUserId.toString() !== auth.sub) throw new ApiError(403, "FORBIDDEN", "Not your order.");
    if (order.status !== "COMPLETED") throw new ApiError(409, "ORDER_NOT_COMPLETED", "Order must be completed first.");

    const review = await Review.create({
      orderId: order._id,
      clientUserId: order.clientUserId,
      creatorUserId: order.creatorUserId,
      stars: body.stars,
      text: body.text ?? "",
      status: "active",
    });

    return Response.json({ ok: true, review: { id: review._id.toString() } }, { status: 201 });
  } catch (err) {
    // Handle duplicate review nicely
    if ((err as any)?.code === 11000) {
      return toErrorResponse(new ApiError(409, "ALREADY_REVIEWED", "You already reviewed this order."));
    }
    return toErrorResponse(err);
  }
}

