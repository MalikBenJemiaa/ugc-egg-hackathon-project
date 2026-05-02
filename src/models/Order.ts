import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type OrderStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED";

const OrderSchema = new Schema(
  {
    clientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creatorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: {
      type: [
        new Schema(
          {
            key: { type: String, required: true },
            label: { type: String, required: true },
            coins: { type: Number, required: true, min: 0 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    totalCoins: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      required: true,
      enum: ["REQUESTED", "ACCEPTED", "IN_PROGRESS", "DELIVERED", "COMPLETED", "CANCELLED"],
      default: "REQUESTED",
      index: true,
    },
  },
  { timestamps: true }
);

export type OrderDoc = InferSchemaType<typeof OrderSchema> & { _id: mongoose.Types.ObjectId };

export const Order: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) || mongoose.model<OrderDoc>("Order", OrderSchema);

