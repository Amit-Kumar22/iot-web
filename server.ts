/**
 * Custom server: one Node process runs
 *   - the Next.js website + REST API          (http://HOST:PORT)
 *   - WebSockets for dashboards and hardware  (ws://HOST:PORT/ws/app, /ws/device)
 *   - an MQTT broker for hardware             (mqtt://HOST:MQTT_PORT)
 *   - the scheduler (src/lib/schedules.ts) that switches pins at set times
 *
 * They share one in-process event bus (src/lib/bus.ts), so a switch toggled
 * on the website reaches an ESP32 over MQTT instantly, and vice versa.
 */
import { loadEnvConfig } from "@next/env";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
loadEnvConfig(process.cwd(), dev);

const port = Number(process.env.PORT || 5010);
const hostname = process.env.HOST || "0.0.0.0";
const mqttPort = Number(process.env.MQTT_PORT || 1883);

// Comma-separated list of website origins allowed to call the API, or "*".
const corsOrigins = (process.env.CORS_ORIGIN || "*").split(",").map((s) => s.trim()).filter(Boolean);

function applyCors(req: IncomingMessage, res: ServerResponse): boolean {
  if (!req.url?.startsWith("/api/")) return false;
  const origin = req.headers.origin;
  if (corsOrigins.includes("*")) res.setHeader("Access-Control-Allow-Origin", "*");
  else if (origin && corsOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-Device-Token");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.writeHead(204).end();
    return true;
  }
  return false;
}

async function main() {
  // Imported after env is loaded.
  const { connectDB } = await import("./src/lib/db");
  const { startHub, resetConnectionFlags } = await import("./src/realtime/hub");
  const { attachWebSockets } = await import("./src/realtime/ws");
  const { startMqtt } = await import("./src/realtime/mqtt");
  const { startScheduler } = await import("./src/lib/schedules");

  await connectDB();
  await resetConnectionFlags();
  startHub();
  startScheduler();

  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = createServer((req, res) => {
    // CORS headers must be set before Next.js starts writing the response.
    if (applyCors(req, res)) return;
    handle(req, res);
  });
  attachWebSockets(server);
  server.listen(port, hostname, () => {
    console.log(`> Web + API   http://localhost:${port}  (${dev ? "dev" : "production"})`);
    console.log(`> WebSocket   ws://localhost:${port}/ws/app  ·  ws://localhost:${port}/ws/device?token=…`);
  });

  if (process.env.MQTT_ENABLED !== "false") {
    await startMqtt(mqttPort);
    console.log(`> MQTT        mqtt://localhost:${mqttPort}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
