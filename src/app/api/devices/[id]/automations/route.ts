import { body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { assertPinsExist, automationJSON } from "@/lib/automations";
import { Automation } from "@/lib/models";
import { AutomationCreate } from "@/lib/schemas";

type Ctx = RouteContext<"/api/devices/[id]/automations">;

export const GET = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "viewer");
  const list = await Automation.find({ device: device._id }).sort({ createdAt: 1 });
  return json({ automations: list.map(automationJSON) });
});

export const POST = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { device } = await loadDevice(id, userId, "owner");
  const input = AutomationCreate.parse(await body(req));
  assertPinsExist(device, [input.pin, input.action.type === "setPin" ? input.action.pin : null]);
  const a = await Automation.create({ ...input, device: device._id, owner: userId });
  return json({ automation: automationJSON(a) }, { status: 201 });
});
