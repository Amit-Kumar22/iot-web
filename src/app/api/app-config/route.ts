import { connection } from "next/server";
import { json, route } from "@/lib/api";
import { AppConfig, HOME_CONFIG_KEY, appConfigJSON } from "@/lib/app-config";

/**
 * Public: the mobile app downloads this at start-up (no login needed) and
 * caches it, because on the control box's hotspot there is no internet.
 * Compare `version` to skip work when nothing changed.
 */
export const GET = route(async () => {
  await connection(); // always request-time, never prerendered at build
  const doc = await AppConfig.findOne({ key: HOME_CONFIG_KEY });
  return json(appConfigJSON(doc), { headers: { "cache-control": "no-store" } });
});
