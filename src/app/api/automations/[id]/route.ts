import { isValidObjectId } from "mongoose";
import { ApiError, body, json, route } from "@/lib/api";
import { loadDevice } from "@/lib/access";
import { requireUserId } from "@/lib/auth";
import { assertPinsExist, automationJSON } from "@/lib/automations";
import { Automation } from "@/lib/models";
import { AutomationUpdate } from "@/lib/schemas";

type Ctx = RouteContext<"/api/automations/[id]">;

async function loadOwned(id: string, userId: string) {
  if (!isValidObjectId(id)) throw new ApiError(404, "Automation not found");
  const a = await Automation.findById(id);
  if (!a) throw new ApiError(404, "Automation not found");
  const { device } = await loadDevice(String(a.device), userId, "owner");
  return { a, device };
}

export const PATCH = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { a, device } = await loadOwned(id, userId);
  const input = AutomationUpdate.parse(await body(req));
  assertPinsExist(device, [input.pin, input.action?.type === "setPin" ? input.action.pin : null]);
  a.set(input);
  // Changing the rule re-arms it so it can fire on the next matching value.
  if (input.pin || input.op || input.threshold !== undefined || input.enabled) a.conditionMet = false;
  await a.save();
  return json({ automation: automationJSON(a) });
});

export const DELETE = route(async (req, ctx: Ctx) => {
  const userId = await requireUserId(req);
  const { id } = await ctx.params;
  const { a } = await loadOwned(id, userId);
  await a.deleteOne();
  return json({ ok: true });
});
