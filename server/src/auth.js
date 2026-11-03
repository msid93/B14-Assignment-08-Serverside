import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { fromNodeHeaders } from "better-auth/node";
import { SignJWT, jwtVerify } from "jose";
import { client, db, origin, required } from "./db.js";
import { fail } from "./errors.js";

const google = process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
export const googleEnabled = Boolean(google);
const cookieName = "studio_access";
const cookieOptions = {
  httpOnly: true,
  secure: origin.startsWith("https:"),
  sameSite: "lax",
  path: "/api",
};
const jwtKey = new TextEncoder().encode(required("JWT_SECRET"));
if (jwtKey.length < 32 || required("BETTER_AUTH_SECRET").length < 32)
  throw new Error("Use two secrets of at least 32 characters.");
if (process.env.JWT_SECRET === process.env.BETTER_AUTH_SECRET)
  throw new Error("Choose independent session and JWT secrets.");

export const auth = betterAuth({
  baseURL: origin,
  secret: required("BETTER_AUTH_SECRET"),
  database: mongodbAdapter(db, { client }),
  trustedOrigins: [origin],
  advanced: { useSecureCookies: cookieOptions.secure },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    minPasswordLength: 6,
  },
  socialProviders: google
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {},
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const password = ctx.body?.password || "";
      if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || password.length < 6) {
        throw new APIError("BAD_REQUEST", {
          message: "Use at least 6 characters, including uppercase and lowercase letters.",
        });
      }
    }),
  },
});

async function liveSession(req) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
  if (!session) fail(401, "Please log in to continue.");
  return session;
}

export async function issueAccess(req, res) {
  const { user, session } = await liveSession(req);
  const token = await new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("studiospace")
    .setAudience("studiospace-api")
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(jwtKey);
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: 15 * 60 * 1000 }).json({ ok: true });
}

export function clearAccess(req, res) {
  res.clearCookie(cookieName, cookieOptions).sendStatus(204);
}

export async function requireMember(req, res, next) {
  let claims;
  try {
    const token = req.cookies[cookieName];
    claims = (
      await jwtVerify(token, jwtKey, {
        algorithms: ["HS256"],
        issuer: "studiospace",
        audience: "studiospace-api",
      })
    ).payload;
  } catch {
    fail(401, "Your access cookie needs to be renewed.");
  }
  const { user, session } = await liveSession(req);
  if (claims.sub !== user.id || claims.sid !== session.id) fail(401, "Please sign in again.");
  req.user = user;
  next();
}
