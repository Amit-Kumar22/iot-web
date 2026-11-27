import { z } from "zod";
import { ApiError, body, route } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { User } from "@/lib/models";
import { sessionResponse } from "@/lib/session-response";

const Signup = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email().max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
});

export const POST = route(async (req) => {
  const { name, email, password } = Signup.parse(await body(req));
  const lower = email.toLowerCase();
  if (await User.exists({ email: lower })) throw new ApiError(409, "An account with this email already exists");
  const user = await User.create({ name, email: lower, passwordHash: await hashPassword(password) });
  return sessionResponse(user, 201);
});
