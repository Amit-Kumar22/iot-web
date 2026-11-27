import { isValidObjectId } from "mongoose";
import { Device, type DeviceDoc } from "./models";
import { ApiError } from "./errors";

export type Role = "owner" | "operator" | "viewer";
const RANK: Record<Role, number> = { viewer: 1, operator: 2, owner: 3 };

export function roleFor(device: Pick<DeviceDoc, "owner" | "shares">, userId: string): Role | null {
  if (String(device.owner) === userId) return "owner";
  // s.user may be an ObjectId or a populated user document
  const share = device.shares.find((s) => String((s.user as { _id?: unknown })?._id ?? s.user) === userId);
  return share ? (share.role as Role) : null;
}

/**
 * Loads a device the user may access with at least `need` permission.
 * Returns 404 (not 403) for devices the user can't see at all, so ids don't leak.
 */
export async function loadDevice(id: string, userId: string, need: Role): Promise<{ device: DeviceDoc; role: Role }> {
  if (!isValidObjectId(id)) throw new ApiError(404, "Device not found");
  const device = await Device.findById(id);
  const role = device && roleFor(device, userId);
  if (!device || !role) throw new ApiError(404, "Device not found");
  if (RANK[role] < RANK[need]) throw new ApiError(403, `This action needs ${need} access`);
  return { device, role };
}

export function accessibleDevicesFilter(userId: string) {
  return { $or: [{ owner: userId }, { "shares.user": userId }] };
}
