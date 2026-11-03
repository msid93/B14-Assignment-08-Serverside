import { MongoClient } from "mongodb";

export function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before starting StudioSpace.`);
  return value;
}

export const origin = new URL(required("APP_ORIGIN")).origin;
export const client = new MongoClient(required("MONGODB_URI"), {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 8000,
});
export const db = client.db(process.env.MONGODB_DB || "studiospace");
export const studios = db.collection("studios");
export const bookings = db.collection("bookings");

export async function prepareDatabase() {
  await Promise.all([
    studios.createIndex({ rating: -1, createdAt: -1 }),
    studios.createIndex({ ownerEmail: 1 }),
    bookings.createIndex({ guestId: 1, createdAt: -1 }),
    bookings.createIndex({ hostId: 1, createdAt: -1 }),
    bookings.createIndex({ studioId: 1, day: 1, status: 1, start: 1, end: 1 }),
    db.collection("newsletter").createIndex({ email: 1 }, { unique: true }),
  ]);
}
