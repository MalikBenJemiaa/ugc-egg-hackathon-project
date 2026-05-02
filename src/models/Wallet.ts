import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const WalletSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    balanceCoins: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

export type WalletDoc = InferSchemaType<typeof WalletSchema> & { _id: mongoose.Types.ObjectId };

export const Wallet: Model<WalletDoc> =
  (mongoose.models.Wallet as Model<WalletDoc>) || mongoose.model<WalletDoc>("Wallet", WalletSchema);

