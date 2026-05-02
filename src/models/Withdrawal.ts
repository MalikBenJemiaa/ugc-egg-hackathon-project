import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type WithdrawalStatus = "REQUESTED" | "PROCESSED" | "REJECTED";

const WithdrawalSchema = new Schema(
  {
    creatorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    coins: { type: Number, required: true, min: 0 },
    grossDT: { type: Number, required: true, min: 0 },
    commissionDT: { type: Number, required: true, min: 0 },
    netDT: { type: Number, required: true, min: 0 },
    status: { type: String, required: true, enum: ["REQUESTED", "PROCESSED", "REJECTED"], default: "REQUESTED" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

export type WithdrawalDoc = InferSchemaType<typeof WithdrawalSchema> & { _id: mongoose.Types.ObjectId };

export const Withdrawal: Model<WithdrawalDoc> =
  (mongoose.models.Withdrawal as Model<WithdrawalDoc>) ||
  mongoose.model<WithdrawalDoc>("Withdrawal", WithdrawalSchema);

