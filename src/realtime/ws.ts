import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import { verifySession } from "@/lib/auth";
import { bus } from "@/lib/bus";
import { accessibleDevicesFilter } from "@/lib/access";
import { deviceByToken } from "@/lib/device-auth";
import { Device } from "@/lib/models";
import { deviceConnected, deviceDisconnected, deviceReported, type DeviceConn } from "./hub";

/**
 * Two WebSocket endpoints on the same port as the website:
 *
 *   /ws/app     dashboards & mobile apps — live pin values, device status, notifications
 *               auth: first message {"type":"auth","token":"<session token from /api/auth/login>"}
 *               then {"type":"subscribe","deviceIds":["..."]}
 *
 *   /ws/device?token=<device token>   hardware (ESP32 etc.)
 *               device → server  {"pin":"V1","value":23.5}   or  {"V1":23.5,"V2":1}
 *               server → device  {"pin":"V2","value":1}
 */

type AppClient = { ws: WebSocket; userId: string | null; subs: Set<string>; alive: boolean };
const appClients = new Set<AppClient>();
const MAX_MSG = 16 * 1024;

function send(ws: WebSocket, msg: unknown) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

export function attachWebSockets(server: Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    // Everything else (e.g. Next.js HMR in dev) is handled by Next's own upgrade listener.
    if (pathname !== "/ws/app" && pathname !== "/ws/device") return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (pathname === "/ws/app") onApp(ws);
      else onDevice(ws, req);
    });
  });

  /* -------- fan-out from the event bus to app clients -------- */
  bus.on("pin", (e) => {
    for (const c of appClients) if (c.subs.has(e.deviceId)) send(c.ws, { type: "pin", ...e });
  });
  bus.on("status", (e) => {
    for (const c of appClients) if (c.subs.has(e.deviceId)) send(c.ws, { type: "status", ...e });
  });
  bus.on("notify", (e) => {
    const ids = new Set(e.userIds);
    for (const c of appClients) if (c.userId && ids.has(c.userId)) send(c.ws, { type: "notification", ...e.notification });
  });

  /* -------- heartbeat: drop dead app sockets every 30s -------- */
  const timer = setInterval(() => {
    for (const c of appClients) {
      if (!c.alive) {
        c.ws.terminate();
        continue;
      }
      c.alive = false;
      c.ws.ping();
    }
  }, 30_000);
  timer.unref();

  return wss;
}

/* ================================================================ app */

function onApp(ws: WebSocket) {
  const client: AppClient = { ws, userId: null, subs: new Set(), alive: true };
  appClients.add(client);
  ws.on("pong", () => (client.alive = true));
  ws.on("close", () => appClients.delete(client));
  ws.on("error", () => ws.terminate());

  ws.on("message", async (raw) => {
    let msg: { type?: string; token?: string; deviceIds?: unknown };
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return send(ws, { type: "error", error: "Invalid JSON" });
    }
    if (msg.type === "auth") {
      client.userId = await verifySession(msg.token);
      if (!client.userId) return send(ws, { type: "error", error: "Invalid session token" });
      return send(ws, { type: "ready", userId: client.userId });
    }
    if (msg.type === "subscribe") {
      if (!client.userId) return send(ws, { type: "error", error: "Not authenticated" });
      const ids = Array.isArray(msg.deviceIds) ? msg.deviceIds.filter((x): x is string => typeof x === "string") : [];
      const valid = ids.filter((id) => /^[a-f0-9]{24}$/.test(id)).slice(0, 500);
      const allowed = await Device.find({ _id: { $in: valid }, ...accessibleDevicesFilter(client.userId) }, { _id: 1 });
      client.subs = new Set(allowed.map((d) => String(d._id)));
      return send(ws, { type: "subscribed", deviceIds: [...client.subs] });
    }
  });
}

/* ============================================================= device */

async function onDevice(ws: WebSocket, req: IncomingMessage) {
  const url = new URL(req.url ?? "/", "http://localhost");
  let device;
  try {
    device = await deviceByToken(url.searchParams.get("token") ?? (req.headers["x-device-token"] as string));
  } catch {
    send(ws, { error: "Invalid auth token" });
    return ws.close(4001, "invalid token");
  }
  const deviceId = String(device._id);
  let alive = true;

  const conn: DeviceConn = {
    kind: "ws",
    send: (pin, value) => send(ws, { pin, value }),
    close: () => ws.close(4002, "token revoked"),
  };

  ws.on("pong", () => (alive = true));
  const hb = setInterval(() => {
    if (!alive) return ws.terminate();
    alive = false;
    ws.ping();
  }, 30_000);
  ws.on("close", () => {
    clearInterval(hb);
    deviceDisconnected(deviceId, conn).catch((e) => console.error("[ws:device]", e));
  });
  ws.on("error", () => ws.terminate());

  ws.on("message", async (raw) => {
    alive = true;
    let msg: Record<string, unknown>;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return send(ws, { error: "Send JSON like {\"pin\":\"V1\",\"value\":10}" });
    }
    const pairs: [string, unknown][] =
      typeof msg.pin === "string"
        ? [[msg.pin.toUpperCase(), msg.value]]
        : Object.entries(msg).filter(([k]) => /^v\d{1,3}$/i.test(k)).map(([k, v]) => [k.toUpperCase(), v]);
    for (const [pin, value] of pairs) {
      try {
        await deviceReported(deviceId, pin, value);
      } catch (e) {
        send(ws, { error: (e as Error).message, pin });
      }
    }
  });

  send(ws, { type: "ready", deviceId });
  await deviceConnected(device, conn);
  // Socket closed while we were registering → undo, so it doesn't stay "connected".
  if (ws.readyState !== ws.OPEN) await deviceDisconnected(deviceId, conn);
}
