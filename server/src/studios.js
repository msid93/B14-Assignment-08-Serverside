import { Router } from "express";
import { bookings, client, studios } from "./db.js";
import { requireMember } from "./auth.js";
import { fail, objectId } from "./errors.js";
import { activeStatuses, categories, checkDay, studioFields } from "./validation.js";

export const studioRoutes = Router();
const newest = { createdAt: -1, _id: -1 };
const publicCard = {
  title: 1,
  category: 1,
  location: 1,
  rate: 1,
  images: { $slice: 1 },
  rating: 1,
  capacity: 1,
};

studioRoutes.get("/", async (req, res) => {
  const filter = {};
  if (req.query.category) {
    if (!categories.includes(req.query.category)) fail(400, "Unknown studio category.");
    filter.category = req.query.category;
  }
  const search = String(req.query.q || "")
    .trim()
    .slice(0, 100);
  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = ["title", "location"].map((field) => ({
      [field]: { $regex: literal, $options: "i" },
    }));
  }
  const result = studios.find(filter, { projection: publicCard });
  if (req.query.featured === "1")
    return res.json(
      await result
        .sort({ rating: -1, ...newest })
        .limit(6)
        .toArray(),
    );
  res.json(await result.sort(newest).toArray());
});

studioRoutes.get("/mine", requireMember, async (req, res) => {
  res.json(
    await studios.find({ ownerEmail: req.user.email, ownerId: req.user.id }).sort(newest).toArray(),
  );
});

studioRoutes.get("/:id/availability", async (req, res) => {
  const studioId = objectId(req.params.id);
  checkDay(req.query.day);
  if (!(await studios.findOne({ _id: studioId }, { projection: { _id: 1 } })))
    fail(404, "Studio not found.");
  const busy = await bookings
    .find(
      { studioId, day: req.query.day, status: { $in: activeStatuses } },
      { projection: { _id: 0, start: 1, end: 1 } },
    )
    .sort({ start: 1 })
    .toArray();
  res.json(busy);
});

studioRoutes.get("/:id", async (req, res) => {
  const studio = await studios.findOne(
    { _id: objectId(req.params.id) },
    { projection: { ownerEmail: 0, revision: 0 } },
  );
  if (!studio) fail(404, "This studio is no longer listed.");
  res.json(studio);
});

studioRoutes.post("/", requireMember, async (req, res) => {
  const studio = {
    ...studioFields(req.body),
    ownerId: req.user.id,
    ownerEmail: req.user.email,
    ownerName: req.user.name,
    ownerImage: req.user.image || "",
    reviews: [],
    rating: 0,
    createdAt: new Date(),
  };
  const result = await studios.insertOne(studio);
  res.status(201).json({ id: result.insertedId });
});

studioRoutes.put("/:id", requireMember, async (req, res) => {
  const result = await studios.updateOne(
    { _id: objectId(req.params.id), ownerId: req.user.id },
    { $set: { ...studioFields(req.body), updatedAt: new Date() } },
  );
  if (!result.matchedCount) fail(404, "You do not own this listing or it no longer exists.");
  res.json({ ok: true });
});

studioRoutes.delete("/:id", requireMember, async (req, res) => {
  const _id = objectId(req.params.id);
  await client.withSession((session) =>
    session.withTransaction(async () => {
      const removed = await studios.deleteOne({ _id, ownerId: req.user.id }, { session });
      if (!removed.deletedCount) fail(404, "Listing not found in your account.");
      if (await bookings.findOne({ studioId: _id, status: { $in: activeStatuses } }, { session })) {
        fail(409, "Resolve the active bookings before deleting this studio.");
      }
    }),
  );
  res.sendStatus(204);
});
