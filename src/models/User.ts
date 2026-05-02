import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export type UserRole = "client" | "creator" | "admin";
export type UserStatus = "active" | "suspended";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    image: { type: String, trim: true },
    role: { type: String, required: true, enum: ["client", "creator", "admin"], index: true },
    status: { type: String, required: true, enum: ["active", "suspended"], default: "active" },
    name: { type: String, trim: true, default: "" },
    phoneNumber: { type: String, trim: true, default: "" },
    companyName: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

export const User: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) || mongoose.model<UserDoc>("User", UserSchema);

