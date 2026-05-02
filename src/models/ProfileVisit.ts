import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProfileVisitSchema = new Schema(
  {
    clientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    creatorUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true }
);

ProfileVisitSchema.index({ clientUserId: 1, creatorUserId: 1 }, { unique: true });

export type ProfileVisitDoc = InferSchemaType<typeof ProfileVisitSchema> & { _id: mongoose.Types.ObjectId };

export const ProfileVisit: Model<ProfileVisitDoc> =
  (mongoose.models.ProfileVisit as Model<ProfileVisitDoc>) ||
  mongoose.model<ProfileVisitDoc>("ProfileVisit", ProfileVisitSchema);

