import { Router } from "express";
import { requireMember } from "./auth.js";
import { fail } from "./errors.js";

export const uploadRoutes = Router();
uploadRoutes.post("/", requireMember, async (req, res) => {
  const key = process.env.IMGBB_API_KEY;
  if (!key) fail(503, "Image upload has not been configured.");
  const image = req.body?.image;
  if (typeof image !== "string" || !/^[a-zA-Z0-9+/]+=*$/.test(image))
    fail(400, "Upload a JPG, PNG, or WebP photo.");
  const bytes = Buffer.from(image, "base64");
  if (bytes.length > 2 * 1024 * 1024) fail(413, "Choose a photo smaller than 2 MB.");
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const png = bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!jpeg && !png && !webp) fail(400, "Unsupported photo format.");
  const body = new FormData();
  body.set("key", key);
  body.set("image", image);
  const reply = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body,
    signal: AbortSignal.timeout(15000),
  });
  if (!reply.ok) fail(502, "ImgBB could not store this photo.");
  const result = await reply.json();
  if (!result.data?.url?.startsWith("https://")) fail(502, "No image URL was returned.");
  res.status(201).json({ url: result.data.url });
});
