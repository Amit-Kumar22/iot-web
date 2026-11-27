import mongoose, { Schema, model, type Model } from "mongoose";
import { z } from "zod";
import { APPLIANCE_ICON_NAMES } from "./appliance-icons";

/**
 * Remote config for the mobile app's offline "Home Automation" module
 * (the ESP32 control box reached over its own Wi-Fi hotspot).
 * One global document; edited by admins on the website, read by every app.
 */

export interface ApplianceT {
  id: string;
  name: string;
  icon: string;
  on: string;
  off: string;
  /** Other route names the box firmware might use (app tries /<name>/on|off on HTTP 404). */
  altNames: string[];
}

export interface AppConfigT {
  key: string;
  version: number;
  appliances: ApplianceT[];
  updatedBy: string | null;
  updatedAt?: Date;
}

const ApplianceSchema = new Schema<ApplianceT>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, required: true },
    on: { type: String, required: true },
    off: { type: String, required: true },
    altNames: { type: [String], default: [] },
  },
  { _id: false },
);

const AppConfigSchema = new Schema<AppConfigT>(
  {
    key: { type: String, required: true, unique: true },
    version: { type: Number, default: 1 },
    appliances: { type: [ApplianceSchema], default: [] },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const AppConfig: Model<AppConfigT> =
  (mongoose.models.AppConfig as Model<AppConfigT> | undefined) ?? model<AppConfigT>("AppConfig", AppConfigSchema);

export const HOME_CONFIG_KEY = "home";

/** Same as the app's built-in list, so nothing changes until an admin edits it. */
export const DEFAULT_APPLIANCES: ApplianceT[] = [
  { id: "bulb", name: "Bulb", icon: "bulb", on: "/light/on", off: "/light/off", altNames: ["bulb", "led", "lamp", "light1", "bulb1"] },
  { id: "fan", name: "Fan", icon: "fan", on: "/fan/on", off: "/fan/off", altNames: ["fan1"] },
  { id: "tv", name: "TV", icon: "tv", on: "/tv/on", off: "/tv/off", altNames: [] },
];

const Path = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .transform((p) => (p.startsWith("/") ? p : `/${p}`))
  .refine((p) => /^\/[\w\-./?=&%]*$/.test(p), "Path may only contain letters, digits and / - _ . ? = & %");

export const ApplianceInput = z.object({
  id: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_-]{1,32}$/, "id: lowercase letters, digits, - or _ (max 32)"),
  name: z.string().trim().min(1).max(40),
  icon: z.enum(APPLIANCE_ICON_NAMES),
  on: Path,
  off: Path,
  altNames: z.array(z.string().trim().regex(/^[\w-]{1,32}$/)).max(10).default([]),
});

export const AppConfigInput = z
  .object({ appliances: z.array(ApplianceInput).max(50) })
  .refine((c) => new Set(c.appliances.map((a) => a.id)).size === c.appliances.length, {
    message: "Each appliance needs a unique id",
    path: ["appliances"],
  });

export function appConfigJSON(doc: Pick<AppConfigT, "version" | "appliances" | "updatedAt"> | null) {
  return {
    version: doc?.version ?? 0,
    updatedAt: doc?.updatedAt?.toISOString() ?? null,
    appliances: (doc?.appliances ?? DEFAULT_APPLIANCES).map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      paths: { on: a.on, off: a.off },
      altNames: a.altNames ?? [],
    })),
  };
}
