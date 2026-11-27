import { body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { writePin } from "@/lib/core";
import { WriteBody } from "@/lib/schemas";

/** App → device: set a datastream value (switch, slider, …). Needs operator access. */
export const POST = route(async (req, ctx: RouteContext<"/api/devices/[id]/write">) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "operator");
  const { pin, value } = WriteBody.parse(await body(req));
  const stored = await writePin(device, pin, value, "app");
  return json({ pin, value: stored });
});
