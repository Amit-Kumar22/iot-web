import { isValidObjectId } from "mongoose";
import { ApiError, body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { assertPinsExist } from "@/lib/automations";
import { Schedule } from "@/lib/models";
import { scheduleJSON } from "@/lib/schedules";
import { ScheduleUpdate } from "@/lib/schemas";

type Ctx = RouteContext<"/api/schedules/[id]">;

async function loadEditable(id: string, userId: string) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Schedule not found");
  const s = await Schedule.findById(id);
  if (!s) throw new ApiError(404, "Schedule not found");
  const { device } = await loadDevice(String(s.device), userId, "operator");
  return { s, device };
}

export const PATCH = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { s, device } = await loadEditable(id, userId);
  const input = ScheduleUpdate.parse(await body(req));
  assertPinsExist(device, [input.pin]);
  s.set(input);
  if (input.time || input.days || input.timezone) s.lastError = null;
  await s.save();
  return json({ schedule: scheduleJSON(s) });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { s } = await loadEditable(id, userId);
  await s.deleteOne();
  return json({ ok: true });
});
