import { EventEmitter } from "node:events";

/**
 * In-process event bus. Route handlers emit, the custom server (server.ts)
 * listens and fans out to WebSocket / MQTT clients. Lives on globalThis so
 * the Next.js bundle and server.ts see the same instance.
 */
export type PinEvent = {
  deviceId: string;
  pin: string;
  value: unknown;
  source: "device" | "app" | "automation" | "schedule";
  at: string;
};
export type StatusEvent = { deviceId: string; online: boolean; connected: boolean; lastSeen: string | null };
export type NotifyEvent = {
  userIds: string[];
  notification: { title: string; message: string; deviceId: string | null; createdAt: string };
};
export type RevokeEvent = { deviceId: string };

type Events = {
  pin: [PinEvent];
  status: [StatusEvent];
  notify: [NotifyEvent];
  "device:revoke": [RevokeEvent];
};

const g = globalThis as unknown as { __iotBus?: EventEmitter<Events> };
export const bus: EventEmitter<Events> = g.__iotBus ?? (g.__iotBus = new EventEmitter<Events>());
bus.setMaxListeners(50);
