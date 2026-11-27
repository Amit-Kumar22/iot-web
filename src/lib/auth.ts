import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { ApiError } from "./errors";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET must be set and at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

/** Returns the user id, or null if the token is missing/invalid/expired. */
export async function verifySession(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/** Session token from the `Authorization: Bearer <token>` header (website and mobile apps). */
export function sessionTokenFrom(headers: Headers): string | null {
  const auth = headers.get("authorization");
  return auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null;
}

export async function requireUserId(req: Request): Promise<string> {
  const id = await verifySession(sessionTokenFrom(req.headers));
  if (!id) throw new ApiError(401, "Not signed in");
  return id;
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const checkPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
