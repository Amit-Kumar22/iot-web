import { z } from "zod";
import { AUTOMATION_OPS, DATASTREAM_KINDS, SHARE_ROLES } from "./models";
import { isPin } from "./pins";

export const Pin = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .refine(isPin, "Pin must be V0 – V255");

const DatastreamBase = z.object({
  name: z.string().trim().min(1).max(60),
  kind: z.enum(DATASTREAM_KINDS),
  min: z.number().finite().default(0),
  max: z.number().finite().default(100),
  step: z.number().positive().default(1),
  unit: z.string().trim().max(12).default(""),
});

export const DatastreamCreate = DatastreamBase.extend({ pin: Pin }).refine((d) => d.max > d.min, {
  message: "max must be greater than min",
  path: ["max"],
});
export const DatastreamUpdate = DatastreamBase.partial();

export const DeviceCreate = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  datastreams: z.array(DatastreamCreate).max(256).default([]),
});
export const DeviceUpdate = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(300).optional(),
});

export const WriteBody = z.object({ pin: Pin, value: z.union([z.number(), z.string().max(256), z.boolean()]) });

export const ShareBody = z.object({ email: z.email(), role: z.enum(SHARE_ROLES).default("viewer") });

const AutomationAction = z.discriminatedUnion("type", [
  z.object({ type: z.literal("notify"), message: z.string().trim().max(300).default("") }),
  z.object({ type: z.literal("setPin"), pin: Pin, value: z.union([z.number(), z.string().max(256)]) }),
]);

export const AutomationCreate = z.object({
  name: z.string().trim().min(1).max(80),
  pin: Pin,
  op: z.enum(AUTOMATION_OPS),
  threshold: z.number().finite(),
  action: AutomationAction,
  enabled: z.boolean().default(true),
  cooldownSec: z.number().int().min(0).max(86400).default(60),
});
export const AutomationUpdate = AutomationCreate.partial();
