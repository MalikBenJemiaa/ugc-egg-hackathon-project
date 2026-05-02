import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type ReviewStatus = "active" | "deleted";

const ReviewSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    clientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creatorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    stars: { type: Number, required: true, min: 1, max: 5, index: true },
    text: { type: String, trim: true, maxlength: 4000 },
    status: { type: String, required: true, enum: ["active", "deleted"], default: "active", index: true },
  },
  { timestamps: true }
);

ReviewSchema.index({ orderId: 1, clientUserId: 1 }, { unique: true });

export type ReviewDoc = InferSchemaType<typeof ReviewSchema> & { _id: mongoose.Types.ObjectId };

export const Review: Model<ReviewDoc> =
  (mongoose.models.Review as Model<ReviewDoc>) || mongoose.model<ReviewDoc>("Review", ReviewSchema);

