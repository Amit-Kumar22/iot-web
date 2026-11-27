import { body, json, route } from "@/lib/api";
import { requireAdmin } from "@/lib/admin";
import { AppConfig, AppConfigInput, HOME_CONFIG_KEY, appConfigJSON } from "@/lib/app-config";

/** Admin: replace the appliance list. Every app picks it up on its next start / refresh. */
export const PUT = route(async (req) => {
  const admin = await requireAdmin(req);
  const { appliances } = AppConfigInput.parse(await body(req));
  const doc = await AppConfig.findOneAndUpdate(
    { key: HOME_CONFIG_KEY },
    { $set: { appliances, updatedBy: admin.email }, $inc: { version: 1 } },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
  );
  return json(appConfigJSON(doc));
});
