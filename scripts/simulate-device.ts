/**
 * Fake ESP32 for testing without hardware.
 *
 *   npm run simulate -- <DEVICE_TOKEN> [server]
 *   npm run simulate -- 3f2a...c9 http://localhost:5010
 *
 * Connects like real hardware (WebSocket /ws/device), then:
 *   - every 3 s sends a temperature on V1 and humidity on V2 (if those datastreams exist)
 *   - prints every command it receives from the website/app (switch, slider, automation)
 *     and reports it back, like a relay would.
 * Create the device on the website with "Start from: Weather station" or add
 * V1/V2 "value" datastreams; add a V0 "switch" to see commands arrive.
 */
import WebSocket from "ws";

const token = process.argv[2];
const server = (process.argv[3] || process.env.SERVER || "http://localhost:5010").replace(/\/+$/, "");
if (!token || !/^[a-f0-9]{32}$/.test(token)) {
  console.error("Usage: npm run simulate -- <DEVICE_TOKEN> [http://localhost:5010]");
  console.error("Copy the token from the website: Device → Setup → Auth token.");
  process.exit(1);
}

const url = `${server.replace(/^http/, "ws")}/ws/device?token=${token}`;
let temp = 26 + Math.random() * 3;
let hum = 55 + Math.random() * 10;
let timer: ReturnType<typeof setInterval> | null = null;

function connect() {
  console.log(`Connecting to ${server} …`);
  const ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("✓ Connected — the device now shows Online on the website\n");
    timer = setInterval(() => {
      temp = Math.min(45, Math.max(15, temp + (Math.random() - 0.5) * 1.2));
      hum = Math.min(95, Math.max(20, hum + (Math.random() - 0.5) * 3));
      const msg = { V1: Number(temp.toFixed(1)), V2: Math.round(hum) };
      ws.send(JSON.stringify(msg));
      console.log(`→ sent     V1 (temperature) = ${msg.V1}   V2 (humidity) = ${msg.V2}`);
    }, 3000);
  });

  ws.on("message", (raw) => {
    const msg = JSON.parse(String(raw));
    if (msg.type === "ready") return;
    if (msg.error) {
      // e.g. V1/V2 not defined on this device
      console.log(`! server:  ${msg.error}`);
      return;
    }
    if (msg.pin) {
      const label = msg.value === 1 ? "ON" : msg.value === 0 ? "OFF" : msg.value;
      console.log(`← received ${msg.pin} = ${label}   (from the website/app — a real ESP32 would switch its relay now)`);
    }
  });

  ws.on("close", (code) => {
    if (timer) clearInterval(timer);
    if (code === 4001) {
      console.error("✗ Invalid token. Copy it again from Device → Setup.");
      process.exit(1);
    }
    if (code === 4002) console.log("Token was regenerated on the website — use the new one.");
    console.log("Disconnected — the device now shows Offline. Reconnecting in 3 s… (Ctrl+C to stop)");
    setTimeout(connect, 3000);
  });

  ws.on("error", (e) => console.error(`! ${e.message}`));
}

connect();
