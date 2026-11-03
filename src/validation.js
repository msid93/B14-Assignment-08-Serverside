import { fail } from "./errors.js";

export const categories = [
  "Photo Studio",
  "Film Stage",
  "Podcast Lounge",
  "Music Suite",
  "Workshop",
];
export const activeStatuses = ["Pending", "Confirmed"];

function string(value, label, min, max) {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) {
    fail(400, `${label} must contain ${min}–${max} characters.`);
  }
  return value.trim();
}

function number(value, label, min, max, integer = false) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer
      ? !Number.isInteger(value)
      : Math.abs(value * 100 - Math.round(value * 100)) > 0.000001)
  ) {
    fail(400, `Enter a valid ${label} between ${min} and ${max}.`);
  }
  return value;
}

function imageURL(value) {
  if (typeof value === "string" && /^\/photos\/[a-z0-9-]+\.webp$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && url.href.length <= 2000)
      return url.href;
  } catch {}
  fail(400, "Enter an HTTPS image URL or upload a photo.");
}

export function studioFields(body = {}) {
  if (!categories.includes(body.category)) fail(400, "Choose a studio category.");
  if (!Array.isArray(body.images) || !body.images.length || body.images.length > 6)
    fail(400, "Add one to six photos.");
  if (!Array.isArray(body.amenities) || body.amenities.length > 16)
    fail(400, "Choose up to 16 amenities.");
  return {
    title: string(body.title, "Studio name", 3, 90),
    category: body.category,
    rate: number(body.rate, "hourly rate", 1, 10000),
    deposit: number(body.deposit, "deposit", 0, 100000),
    capacity: number(body.capacity, "capacity", 1, 1000, true),
    location: string(body.location, "Location", 3, 160),
    overview: string(body.overview, "Overview", 20, 3000),
    images: body.images.map(imageURL),
    amenities: [...new Set(body.amenities.map((x) => string(x, "Amenity", 1, 55)))],
  };
}

export function checkDay(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day))
    fail(400, "Choose a valid date.");
  const date = new Date(day + "T00:00:00Z");
  if (Number.isNaN(+date) || date.toISOString().slice(0, 10) !== day)
    fail(400, "Choose a valid date.");
}

export function slotTime(day, hour) {
  return new Date(`${day}T${String(hour).padStart(2, "0")}:00:00+06:00`);
}

export function checkSlot({ day, start, end }, now = new Date()) {
  checkDay(day);
  number(start, "start hour", 6, 22, true);
  number(end, "end hour", 7, 23, true);
  if (end <= start) fail(400, "End time must be after start time.");
  if (slotTime(day, start) <= now) fail(400, "Choose a future start time.");
}

export function overlapFilter(studioId, day, start, end) {
  return {
    studioId,
    day,
    status: { $in: activeStatuses },
    start: { $lt: end },
    end: { $gt: start },
  };
}
