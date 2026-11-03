import { Router } from "express";
import { requireMember } from "./auth.js";
import { bookings, client, studios } from "./db.js";
import { fail, objectId } from "./errors.js";
import { checkSlot, overlapFilter, slotTime } from "./validation.js";

export const bookingRoutes = Router();
bookingRoutes.use(requireMember);

bookingRoutes.get("/", async (req, res) => {
  const filter = req.query.role === "host" ? { hostId: req.user.id } : { guestId: req.user.id };
  res.json(await bookings.find(filter).sort({ createdAt: -1 }).toArray());
});

bookingRoutes.post("/", async (req, res) => {
  const { day, start, end } = req.body || {};
  const studioId = objectId(req.body?.studioId);
  checkSlot({ day, start, end });
  const bookingId = await client.withSession((session) =>
    session.withTransaction(async () => {
      // Every new request writes the same studio document first. Concurrent transactions
      // for that studio retry against the winning booking before checking the time range.
      const studio = await studios.findOneAndUpdate(
        { _id: studioId },
        { $inc: { revision: 1 } },
        { session },
      );
      if (!studio) fail(404, "This studio is no longer available.");
      if (studio.ownerId === req.user.id) fail(403, "Choose a studio hosted by another creator.");
      if (await bookings.findOne(overlapFilter(studioId, day, start, end), { session })) {
        fail(409, "Another booking holds part of that time. Choose an open slot.");
      }
      const rental = Math.round(studio.rate * 100 * (end - start)) / 100;
      const row = {
        studioId,
        studioTitle: studio.title,
        location: studio.location,
        image: studio.images[0],
        hostId: studio.ownerId,
        guestId: req.user.id,
        guestName: req.user.name,
        day,
        start,
        end,
        rate: studio.rate,
        deposit: studio.deposit,
        rental,
        status: "Pending",
        createdAt: new Date(),
      };
      return (await bookings.insertOne(row, { session })).insertedId;
    }),
  );
  res.status(201).json({ id: bookingId, status: "Pending" });
});

bookingRoutes.patch("/:id", async (req, res) => {
  const _id = objectId(req.params.id);
  const row = await bookings.findOne({
    _id,
    $or: [{ guestId: req.user.id }, { hostId: req.user.id }],
  });
  if (!row) fail(404, "This booking is not in your account.");
  const status = req.body?.status;
  const host = row.hostId === req.user.id;
  const now = new Date();
  const canCancel =
    status === "Cancelled" &&
    (row.status === "Pending" ||
      (host && row.status === "Confirmed" && now < slotTime(row.day, row.start)));
  const canConfirm =
    host &&
    row.status === "Pending" &&
    status === "Confirmed" &&
    now < slotTime(row.day, row.start);
  const canComplete =
    host &&
    row.status === "Confirmed" &&
    status === "Completed" &&
    now >= slotTime(row.day, row.end);
  if (!canCancel && !canConfirm && !canComplete)
    fail(409, "That status change is unavailable for this booking.");
  const changed = await bookings.updateOne(
    { _id, status: row.status },
    { $set: { status, updatedAt: now } },
  );
  if (!changed.modifiedCount) fail(409, "The booking changed. Refresh and try again.");
  res.json({ status });
});
