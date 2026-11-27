import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { connectDB } from "./db";
import { ApiError } from "./errors";

export { ApiError };

export function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

/**
 * Wraps a route handler: connects to MongoDB and turns thrown errors into
 * JSON responses `{ error }` with the right status code.
 */
export function route<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      await connectDB();
      return await fn(req, ctx);
    } catch (err) {
      unstable_rethrow(err); // let Next.js internal signals (e.g. prerender bailout) through
      if (err instanceof ApiError) return json({ error: err.message }, { status: err.status });
      if (err instanceof ZodError) {
        const msg = err.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message)).join("; ");
        return json({ error: msg }, { status: 400 });
      }
      if (err instanceof SyntaxError) return json({ error: "Invalid JSON body" }, { status: 400 });
      console.error("[api]", err);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function body(req: Request): Promise<unknown> {
  const text = await req.text();
  return text ? JSON.parse(text) : {};
}
