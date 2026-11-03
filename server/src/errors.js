import { ObjectId } from "mongodb";

export function fail(status, message) {
  throw Object.assign(new Error(message), { status, publicMessage: true });
}

export function objectId(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{24}$/i.test(value)) fail(400, "Invalid record ID.");
  return new ObjectId(value);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  if (status >= 500)
    console.error(
      "StudioSpace request failed:",
      error.name,
      error.code || "",
      req.method,
      req.path,
    );
  res
    .status(status)
    .json({
      message:
        status >= 500 && !error.publicMessage
          ? "The studio desk is unavailable. Please try again shortly."
          : error.message,
    });
}
