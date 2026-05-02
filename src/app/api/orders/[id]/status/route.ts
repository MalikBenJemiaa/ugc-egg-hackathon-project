import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { requireAuth, requireRole } from "@/lib/require-auth";
import { ApiError, toErrorResponse } from "@/lib/api-errors";
import { Order } from "@/models/Order";
import { Wallet } from "@/models/Wallet";
import { Transaction } from "@/models/Transaction";
import { coinsToDt } from "@/lib/coins";

const UpdateStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "IN_PROGRESS", "DELIVERED", "COMPLETED", "CANCELLED"]),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const auth = requireAuth(req);
    const body = UpdateStatusSchema.parse(await req.json());
    const { id } = await params;

    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Order not found.");

    const isClient = auth.role === "client" && order.clientUserId.toString() === auth.sub;
    const isCreator = auth.role === "creator" && order.creatorUserId.toString() === auth.sub;
    if (!isClient && !isCreator && auth.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "You do not have access to this order.");
    }

    // Very small MVP transition rules
    if (body.status === "CANCELLED") {
      if (!isClient && auth.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Only client can cancel.");
      order.status = "CANCELLED";
      await order.save();
      return Response.json({ ok: true, order: { id: order._id.toString(), status: order.status } });
    }

    if (body.status === "ACCEPTED") {
      if (!isCreator && auth.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Only creator can accept.");
      if (order.status !== "REQUESTED") throw new ApiError(409, "INVALID_STATUS", "Order is not requestable.");

      // Transfer payment immediately on accept (no escrow in MVP).
      const payerWallet = await Wallet.findOne({ userId: order.clientUserId });
      if (!payerWallet || payerWallet.balanceCoins < order.totalCoins) {
        throw new ApiError(402, "LOW_BALANCE", "Client does not have enough coins to pay.");
      }

      await Wallet.updateOne({ userId: order.clientUserId }, { $inc: { balanceCoins: -order.totalCoins } }, { upsert: true });
      await Wallet.updateOne({ userId: order.creatorUserId }, { $inc: { balanceCoins: order.totalCoins } }, { upsert: true });

      await Transaction.create({
        type: "TRANSFER",
        fromUserId: order.clientUserId,
        toUserId: order.creatorUserId,
        coins: order.totalCoins,
        dtEquivalent: coinsToDt(order.totalCoins),
        metadata: { reason: "order_payment", orderId: order._id },
      });

      order.status = "ACCEPTED";
      await order.save();
      return Response.json({ ok: true, order: { id: order._id.toString(), status: order.status } });
    }

    if (body.status === "IN_PROGRESS") {
      if (!isCreator && auth.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Only creator can update.");
      if (order.status !== "ACCEPTED") throw new ApiError(409, "INVALID_STATUS", "Order must be accepted first.");
      order.status = "IN_PROGRESS";
      await order.save();
      return Response.json({ ok: true, order: { id: order._id.toString(), status: order.status } });
    }

    if (body.status === "DELIVERED") {
      if (!isCreator && auth.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Only creator can update.");
      if (order.status !== "IN_PROGRESS") throw new ApiError(409, "INVALID_STATUS", "Order must be in progress.");
      order.status = "DELIVERED";
      await order.save();
      return Response.json({ ok: true, order: { id: order._id.toString(), status: order.status } });
    }

    if (body.status === "COMPLETED") {
      if (!isClient && auth.role !== "admin") throw new ApiError(403, "FORBIDDEN", "Only client can complete.");
      if (order.status !== "DELIVERED") throw new ApiError(409, "INVALID_STATUS", "Order must be delivered first.");
      order.status = "COMPLETED";
      await order.save();
      return Response.json({ ok: true, order: { id: order._id.toString(), status: order.status } });
    }

    throw new ApiError(400, "INVALID_STATUS", "Unsupported status transition.");
  } catch (err) {
    return toErrorResponse(err);
  }
}

