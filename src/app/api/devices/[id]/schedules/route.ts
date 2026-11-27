import { body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { assertPinsExist } from "@/lib/automations";
import { Schedule } from "@/lib/models";
import { scheduleJSON } from "@/lib/schedules";
import { ScheduleCreate } from "@/lib/schemas";

type Ctx = RouteContext<"/api/devices/[id]/schedules">;

const MAX_PER_DEVICE = 50;

export const GET = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "viewer");
  const list = await Schedule.find({ device: device._id }).sort({ time: 1, createdAt: 1 });
  return json({ schedules: list.map(scheduleJSON) });
});

/** Operators may schedule too: a schedule only does what they could do by hand. */
export const POST = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "operator");
  const input = ScheduleCreate.parse(await body(req));
  assertPinsExist(device, [input.pin]);
  if ((await Schedule.countDocuments({ device: device._id })) >= MAX_PER_DEVICE) {
    return json({ error: `A device can have at most ${MAX_PER_DEVICE} schedules` }, { status: 400 });
  }
  const s = await Schedule.create({ ...input, device: device._id, owner: userId });
  return json({ schedule: scheduleJSON(s) }, { status: 201 });
});
