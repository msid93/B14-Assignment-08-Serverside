import test from "node:test";
import assert from "node:assert/strict";
import { checkDay, checkSlot, overlapFilter, studioFields } from "../src/validation.js";

const now = new Date("2026-01-01T04:00:00Z");
test("Bangladesh-local starts must be in the future", () => {
  assert.throws(() => checkSlot({ day: "2026-01-01", start: 10, end: 11 }, now));
  checkSlot({ day: "2026-01-01", start: 11, end: 12 }, now);
});
test("invalid dates and non-increasing hours are rejected", () => {
  assert.throws(() => checkDay("2026-02-30"));
  assert.throws(() => checkSlot({ day: "2026-01-02", start: 13, end: 13 }, now));
});
test("overlap uses open boundaries, so adjacent bookings can coexist", () => {
  const filter = overlapFilter("room", "2026-12-12", 9, 10);
  assert.deepEqual(filter.start, { $lt: 10 });
  assert.deepEqual(filter.end, { $gt: 9 });
  assert.deepEqual(filter.status.$in, ["Pending", "Confirmed"]);
});
test("a listing rejects unsafe image protocols and fractional capacity", () => {
  const studio = {
    title: "Daylight",
    category: "Photo Studio",
    rate: 42,
    deposit: 0,
    capacity: 8,
    location: "Dhaka",
    overview: "A quiet daylight loft near the centre.",
    images: ["https://example.org/photo.jpg"],
    amenities: [],
  };
  assert.equal(studioFields(studio).rate, 42);
  assert.throws(() => studioFields({ ...studio, images: ["javascript:alert(1)"] }));
  assert.throws(() => studioFields({ ...studio, capacity: 2.5 }));
});
