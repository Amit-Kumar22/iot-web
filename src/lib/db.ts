import mongoose from "mongoose";

// Cached on globalThis so the custom server (server.ts) and Next.js route
// handlers share one connection, and dev hot-reloads don't open new ones.
const g = globalThis as unknown as { __iotMongoose?: Promise<typeof mongoose> };

export function connectDB(): Promise<typeof mongoose> {
  if (!g.__iotMongoose) {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGODB_URI is not set (see .env.example)");
    g.__iotMongoose = mongoose.connect(uri).catch((err) => {
      g.__iotMongoose = undefined;
      throw err;
    });
  }
  return g.__iotMongoose;
}
