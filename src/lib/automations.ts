import type { HydratedDocument } from "mongoose";
import type { AutomationT, DeviceDoc } from "./models";
import { ApiError } from "./errors";

export function automationJSON(a: HydratedDocument<AutomationT>) {
  return {
    id: String(a._id),
    deviceId: String(a.device),
    name: a.name,
    pin: a.pin,
    op: a.op,
    threshold: a.threshold,
    action:
      a.action.type === "notify"
        ? { type: "notify" as const, message: a.action.message ?? "" }
        : { type: "setPin" as const, pin: a.action.pin, value: a.action.value },
    enabled: a.enabled,
    cooldownSec: a.cooldownSec,
    lastTriggeredAt: a.lastTriggeredAt?.toISOString() ?? null,
  };
}

export function assertPinsExist(device: DeviceDoc, pins: (string | undefined | null)[]) {
  for (const p of pins) {
    if (p && !device.datastreams.some((d) => d.pin === p)) throw new ApiError(400, `Datastream ${p} is not defined`);
  }
}
