import { z } from "zod";
import { ApiError, body, route } from "@/lib/api";
import { checkPassword } from "@/lib/auth";
import { User } from "@/lib/models";
import { sessionResponse } from "@/lib/session-response";

const Login = z.object({ email: z.string().trim().min(1), password: z.string().min(1) });

export const POST = route(async (req) => {
  const { email, password } = Login.parse(await body(req));
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !(await checkPassword(password, user.passwordHash))) {
    throw new ApiError(401, "Wrong email or password");
  }
  return sessionResponse(user);
});
