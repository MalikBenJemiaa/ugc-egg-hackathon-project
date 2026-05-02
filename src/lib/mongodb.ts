import mongoose from "mongoose";

type MongooseGlobal = typeof globalThis & {
  __mongooseConn?: {
    promise?: Promise<typeof mongoose>;
    conn?: typeof mongoose;
  };
};

const g = globalThis as MongooseGlobal;

export async function connectToDatabase() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("Missing MONGODB_URI in environment.");
  }

  if (!g.__mongooseConn) g.__mongooseConn = {};
  if (g.__mongooseConn.conn) return g.__mongooseConn.conn;

  if (!g.__mongooseConn.promise) {
    g.__mongooseConn.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  g.__mongooseConn.conn = await g.__mongooseConn.promise;
  return g.__mongooseConn.conn;
}

