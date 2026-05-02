import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type TransactionType =
  | "TOPUP"
  | "PROFILE_VISIT_DEBIT"
  | "TRANSFER"
  | "WITHDRAWAL_REQUEST"
  | "WITHDRAWAL_PROCESSED";

const TransactionSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["TOPUP", "PROFILE_VISIT_DEBIT", "TRANSFER", "WITHDRAWAL_REQUEST", "WITHDRAWAL_PROCESSED"],
      index: true,
    },
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    coins: { type: Number, required: true, min: 0 },
    dtEquivalent: { type: Number, required: true, min: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export type TransactionDoc = InferSchemaType<typeof TransactionSchema> & { _id: mongoose.Types.ObjectId };

export const Transaction: Model<TransactionDoc> =
  (mongoose.models.Transaction as Model<TransactionDoc>) ||
  mongoose.model<TransactionDoc>("Transaction", TransactionSchema);

