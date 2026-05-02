import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type CreatorTier = "standard" | "premium";
export type AvailabilityStatus = "available" | "unavailable";
export type VerifiedStatus = "pending" | "approved" | "rejected" | "changes_requested";

const CreatorProfileSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },

    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, trim: true },

    gender: { type: String, enum: ["man", "woman"] },
    age: { type: Number, min: 13, max: 120 },
    city: { type: String, trim: true },

    niches: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    platforms: { type: [String], default: [] },
    platformLinks: { type: Schema.Types.Mixed, default: {} },

    bio: { type: String, trim: true, maxlength: 2000 },
    portfolioMedia: {
      type: [
        new Schema(
          {
            type: { type: String, enum: ["image", "video"], required: true },
            url: { type: String, required: true },
          },
          { _id: false }
        ),
      ],
      default: [],
    },

    pricing: {
      type: new Schema(
        {
          baseUGCVideoCoins: { type: Number, required: true, default: 0, min: 0 },
          postInstagramCoins: { type: Number, required: true, default: 0, min: 0 },
          postTiktokCoins: { type: Number, required: true, default: 0, min: 0 },
          instagramStoryCoins: { type: Number, required: true, default: 0, min: 0 },
          campaignPackCoins: { type: Number, required: true, default: 0, min: 0 },
        },
        { _id: false }
      ),
      default: {},
    },

    tier: { type: String, required: true, enum: ["standard", "premium"], default: "standard", index: true },

    availabilityStatus: {
      type: String,
      required: true,
      enum: ["available", "unavailable"],
      default: "available",
      index: true,
    },
    returnDate: { type: Date },

    verifiedStatus: {
      type: String,
      required: true,
      enum: ["pending", "approved", "rejected", "changes_requested"],
      default: "pending",
      index: true,
    },

    avgViews: { type: Number, min: 0 },
    avgEngagementRate: { type: Number, min: 0 },
  },
  { timestamps: true }
);

export type CreatorProfileDoc = InferSchemaType<typeof CreatorProfileSchema> & { _id: mongoose.Types.ObjectId };

export const CreatorProfile: Model<CreatorProfileDoc> =
  (mongoose.models.CreatorProfile as Model<CreatorProfileDoc>) ||
  mongoose.model<CreatorProfileDoc>("CreatorProfile", CreatorProfileSchema);

