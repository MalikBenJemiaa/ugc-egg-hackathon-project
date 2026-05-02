import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CoinPackageSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    dtPrice: { type: Number, required: true, min: 0 },
    coinsReceived: { type: Number, required: true, min: 0 },
    bonusCoins: { type: Number, required: true, min: 0, default: 0 },
    active: { type: Boolean, required: true, default: true, index: true },
  },
  { timestamps: true }
);

export type CoinPackageDoc = InferSchemaType<typeof CoinPackageSchema> & { _id: mongoose.Types.ObjectId };

export const CoinPackage: Model<CoinPackageDoc> =
  (mongoose.models.CoinPackage as Model<CoinPackageDoc>) ||
  mongoose.model<CoinPackageDoc>("CoinPackage", CoinPackageSchema);

