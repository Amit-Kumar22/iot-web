import { signSession } from "./auth";

export function userJSON(u: { _id: unknown; email: string; name: string }) {
  return { id: String(u._id), email: u.email, name: u.name };
}

/** Login/signup response. Clients (website, mobile app) send `token` as `Authorization: Bearer <token>`. */
export async function sessionResponse(user: { _id: unknown; email: string; name: string }, status = 200) {
  const token = await signSession(String(user._id));
  return Response.json({ user: userJSON(user), token }, { status });
}
