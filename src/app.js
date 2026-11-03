import express from "express";
import cookieParser from "cookie-parser";
import { toNodeHandler } from "better-auth/node";
import { auth, clearAccess, googleEnabled, issueAccess } from "./auth.js";
import { db, origin } from "./db.js";
import { errorHandler, fail } from "./errors.js";
import { studioRoutes } from "./studios.js";
import { bookingRoutes } from "./bookings.js";
import { uploadRoutes } from "./uploads.js";

const app = express();
app.disable("x-powered-by");
app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "private, no-store");
  const source = req.headers.origin;
  const untrusted = source
    ? source !== origin
    : Boolean(req.headers.cookie || req.headers["sec-fetch-site"] === "cross-site");
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && untrusted) {
    return res.status(403).json({ message: "Open StudioSpace to submit this request." });
  }
  next();
});
app.all("/api/auth/*splat", toNodeHandler(auth));
app.use(express.json({ limit: "3mb" }), cookieParser());
app.get("/api/health", (req, res) => res.json({ service: "StudioSpace", ok: true }));
app.get("/api/config", (req, res) => res.json({ google: googleEnabled }));
app.post("/api/session/access", issueAccess);
app.delete("/api/session/access", clearAccess);
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/uploads", uploadRoutes);
app.post("/api/newsletter", async (req, res) => {
  const email = String(req.body?.email || "")
    .toLowerCase()
    .trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    fail(400, "Enter a valid email address.");
  try {
    await db
      .collection("newsletter")
      .updateOne({ email }, { $setOnInsert: { email, createdAt: new Date() } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  res.json({ ok: true });
});
app.use((req, res) => res.status(404).json({ message: "API route not found." }));
app.use(errorHandler);
export default app;
