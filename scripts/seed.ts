/**
 * Seed script — TypeScript
 * Run: npm run seed
 *
 * Reads MONGODB_URI from .env, then upserts users from public/uploads/creators
 * (role: creator) and public/uploads/sellers (role: client / brand).
 * Email for sellers is derived directly from the filename: Boga.jpg → Boga@gmail.com
 */

import { readdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import mongoose, { Schema } from "mongoose";
import { faker } from "@faker-js/faker";

// ---------------------------------------------------------------------------
// Load .env manually
// ---------------------------------------------------------------------------
const root = process.cwd();

function loadEnv(): void {
  try {
    const raw = readFileSync(path.join(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env optional if vars are already in the environment
  }
}
loadEnv();

// ---------------------------------------------------------------------------
// Inline Mongoose schemas (mirrors src/models/* exactly)
// ---------------------------------------------------------------------------

const UserSchema = new Schema(
  {
    email:        { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    image:        { type: String, trim: true },
    role:         { type: String, required: true, enum: ["client", "creator", "admin"] },
    status:       { type: String, required: true, enum: ["active", "suspended"], default: "active" },
  },
  { timestamps: true }
);

const WalletSchema = new Schema(
  {
    userId:       { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balanceCoins: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

const CreatorProfileSchema = new Schema(
  {
    userId:             { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name:               { type: String, required: true },
    image:              { type: String },
    phoneNumber:        { type: String },
    gender:             { type: String, enum: ["man", "woman"] },
    age:                { type: Number },
    city:               { type: String },
    niches:             { type: [String], default: [] },
    languages:          { type: [String], default: [] },
    platforms:          { type: [String], default: [] },
    platformLinks:      { type: Schema.Types.Mixed, default: {} },
    bio:                { type: String },
    portfolioMedia: {
      type: [
        new Schema(
          { type: { type: String, enum: ["image", "video"] }, url: String },
          { _id: false }
        ),
      ],
      default: [],
    },
    pricing: {
      type: new Schema(
        {
          baseUGCVideoCoins:    { type: Number, default: 0 },
          postInstagramCoins:   { type: Number, default: 0 },
          postTiktokCoins:      { type: Number, default: 0 },
          instagramStoryCoins:  { type: Number, default: 0 },
          campaignPackCoins:    { type: Number, default: 0 },
        },
        { _id: false }
      ),
      default: {},
    },
    tier:               { type: String, enum: ["standard", "premium"], default: "standard" },
    availabilityStatus: { type: String, enum: ["available", "unavailable"], default: "available" },
    returnDate:         { type: Date },
    verifiedStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "changes_requested"],
      default: "pending",
    },
    avgViews:          { type: Number },
    avgEngagementRate: { type: Number },
  },
  { timestamps: true }
);

const User           = mongoose.models["User"]           ?? mongoose.model("User",           UserSchema);
const Wallet         = mongoose.models["Wallet"]         ?? mongoose.model("Wallet",         WalletSchema);
const CreatorProfile = mongoose.models["CreatorProfile"] ?? mongoose.model("CreatorProfile", CreatorProfileSchema);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function baseName(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").trim();
}

async function listImages(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  return files.filter(f => /\.(png|jpe?g|jfif|webp)$/i.test(f));
}

const NICHES = [
  "Restaurant", "Food & Beverage", "Fashion & Clothes", "Coffee & Cafe",
  "Sport & Fitness", "Beauty & Skincare", "Tech & Electronics", "Travel",
  "Home Decor", "Health & Wellness", "Automotive", "Pets", "Other",
];
const CITIES    = ["Tunis", "Ariana", "Sousse", "Sfax", "Bizerte", "Nabeul", "Monastir", "Gafsa"];
const LANGS     = ["Arabic", "French", "English"];
const PLATFORMS = ["Instagram", "TikTok", "YouTube"];
const GENDERS   = ["man", "woman"] as const;

function bioForCreator(name: string, niches: string[], city: string): string {
  const niche = niches[0] ?? "UGC";
  const second = niches[1];
  const focus = second ? `${niche.toLowerCase()} & ${second.toLowerCase()}` : niche.toLowerCase();
  return (
    `${name} is a ${focus} creator based in ${city}, producing bilingual (AR/FR/EN) hooks for TikTok, Reels, and paid social. ` +
    `Recent collaborations include boutique retail launches, restaurant openings, and SaaS onboarding explainers — always with clear CTA overlays and native-sounding voiceovers. ` +
    `Typical turnaround: 3–5 business days for a 2-video sprint with one revision pass.`
  );
}

async function upsertUser(params: {
  name: string;
  email: string;
  role: "client" | "creator";
  image: string;
  passwordHash: string;
}) {
  const { name, email, role, image, passwordHash } = params;

  const user = await User.findOneAndUpdate(
    { email },
    {
      $setOnInsert: { passwordHash, status: "active" },
      $set: { role, image },
    },
    { upsert: true, new: true }
  );

  await Wallet.findOneAndUpdate(
    { userId: user._id },
    { $setOnInsert: { balanceCoins: role === "creator" ? 50 : 0 } },
    { upsert: true, new: true }
  );

  if (role === "creator") {
    const city = faker.helpers.arrayElement(CITIES);
    const niches = faker.helpers.arrayElements(NICHES, { min: 1, max: 3 });

    await CreatorProfile.findOneAndUpdate(
      { userId: user._id },
      {
        $setOnInsert: {
          userId:             user._id,
          verifiedStatus:     "approved",
          availabilityStatus: "available",
          tier:               faker.helpers.arrayElement(["standard", "premium"]),
        },
        $set: {
          name,
          image,
          city,
          gender:    faker.helpers.arrayElement(GENDERS),
          age:       faker.number.int({ min: 18, max: 45 }),
          niches,
          languages: faker.helpers.arrayElements(LANGS,     { min: 1, max: 3 }),
          platforms: faker.helpers.arrayElements(PLATFORMS, { min: 1, max: 2 }),
          bio:       bioForCreator(name, niches, city),
          avgViews:          faker.number.int({ min: 1_000, max: 500_000 }),
          avgEngagementRate: faker.number.float({ min: 1, max: 12, fractionDigits: 1 }),
          pricing: {
            baseUGCVideoCoins:    faker.number.int({ min: 60,  max: 200 }),
            postInstagramCoins:   faker.number.int({ min: 20,  max: 120 }),
            postTiktokCoins:      faker.number.int({ min: 20,  max: 120 }),
            instagramStoryCoins:  faker.number.int({ min: 10,  max: 80  }),
            campaignPackCoins:    faker.number.int({ min: 150, max: 500 }),
          },
        },
      },
      { upsert: true, new: true }
    );
  }

  return user;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set. Check your .env file.");

  console.log("Connecting to MongoDB…");
  await mongoose.connect(uri, { bufferCommands: false });
  console.log("Connected.\n");

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const creatorsDir = path.join(root, "public", "uploads", "creators");
  const sellersDir  = path.join(root, "public", "uploads", "sellers");

  const creatorFiles = await listImages(creatorsDir);
  const sellerFiles  = await listImages(sellersDir);

  let creatorCount = 0;
  let sellerCount  = 0;

  // ── Creators ──────────────────────────────────────────────────────────────
  for (const file of creatorFiles) {
    const name  = baseName(file);
    const email = name.trim().toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9.]/g, "") + "@gmail.com";
    const image = `/uploads/creators/${file}`;
    await upsertUser({ name, email, role: "creator", image, passwordHash });
    console.log(`  ✓ creator  ${name} <${email}>`);
    creatorCount++;
  }

  // ── Sellers (brands) ──────────────────────────────────────────────────────
  // All sellers are clients. Email preserves the original filename casing:
  // Boga.jpg → name: "Boga", email: "Boga@gmail.com"
  for (const file of sellerFiles) {
    const name  = baseName(file);
    const email = `${name}@gmail.com`;
    const image = `/uploads/sellers/${file}`;
    await upsertUser({ name, email, role: "client", image, passwordHash });
    console.log(`  ✓ client   ${name} <${email}>`);
    sellerCount++;
  }

  await mongoose.disconnect();

  console.log("\n✅ Done.");
  console.log(
    JSON.stringify(
      {
        creatorsSeeded:  creatorCount,
        sellersSeeded:   sellerCount,
        total:           creatorCount + sellerCount,
        defaultPassword: "Password123!",
      },
      null,
      2
    )
  );
}

main().catch(err => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
