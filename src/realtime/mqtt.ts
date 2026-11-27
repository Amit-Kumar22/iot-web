import { createServer, type Server } from "node:net";
import { Aedes, type AuthenticateError, type Client } from "aedes";
import { deviceByToken } from "@/lib/device-auth";
import { Device } from "@/lib/models";
import { deviceConnected, deviceDisconnected, deviceReported, syncDevice, type DeviceConn } from "./hub";

/**
 * MQTT broker for hardware.
 *
 *   connect:   username = anything (e.g. "device"), password = device auth token
 *   publish:   up/V1    payload "23.5"        (device → server)
 *   subscribe: down/#                         (server → device)
 *              messages arrive on  dev/<deviceId>/down/V2  payload "1"
 *              — just read the part after the last "/" as the pin.
 *
 * Topics are private per device: a device can only publish to its own up/*
 * and only receives its own down/*.
 */

type Session = { deviceId: string; conn: DeviceConn };
const sessions = new WeakMap<Client, Session>();

function authError(): AuthenticateError {
  const e = new Error("Bad auth token") as AuthenticateError;
  e.returnCode = 4; // BAD_USERNAME_OR_PASSWORD
  return e;
}

export async function startMqtt(port: number): Promise<Server> {
  const broker = await Aedes.createBroker({
    authenticate(client, _username, password, done) {
      deviceByToken(password?.toString())
        .then((device) => {
          const deviceId = String(device._id);
          const conn: DeviceConn = {
            kind: "mqtt",
            send: (pin, value) =>
              broker.publish(
                {
                  cmd: "publish",
                  topic: `dev/${deviceId}/down/${pin}`,
                  payload: Buffer.from(String(value)),
                  qos: 0,
                  retain: false,
                  dup: false,
                },
                () => {},
              ),
            close: () => client.close(),
          };
          sessions.set(client, { deviceId, conn });
          done(null, true);
        })
        .catch(() => done(authError(), false));
    },

    authorizePublish(client, packet, callback) {
      const s = client && sessions.get(client);
      const m = /^up\/(V\d{1,3})$/i.exec(packet.topic);
      if (!s || !m) return callback(new Error("Publish only to up/<pin>, e.g. up/V1"));
      deviceReported(s.deviceId, m[1].toUpperCase(), packet.payload.toString()).catch((e) =>
        console.warn(`[mqtt] ${s.deviceId} ${packet.topic}: ${(e as Error).message}`),
      );
      callback(null);
    },

    authorizeSubscribe(client, sub, callback) {
      const s = sessions.get(client);
      const m = /^down\/(#|V\d{1,3})$/i.exec(sub.topic);
      if (!s || !m) return callback(null, null); // rejected (SUBACK 128)
      // Rewrite to this device's private topic.
      callback(null, { ...sub, topic: `dev/${s.deviceId}/down/${m[1] === "#" ? "#" : m[1].toUpperCase()}` });
    },
  });

  broker.on("clientReady", async (client) => {
    const s = sessions.get(client);
    if (!s) return;
    try {
      const device = await Device.findById(s.deviceId);
      if (!device) return client.close();
      await deviceConnected(device, s.conn, { sync: false });
      if (client.closed) await deviceDisconnected(s.deviceId, s.conn);
    } catch (e) {
      console.error("[mqtt]", e);
    }
  });

  // Once the device subscribes, send it the current values so it can restore state.
  broker.on("subscribe", async (_subs, client) => {
    const s = sessions.get(client);
    if (!s) return;
    const device = await Device.findById(s.deviceId).catch(() => null);
    if (device) setTimeout(() => syncDevice(device, s.conn), 50); // after SUBACK
  });

  broker.on("clientDisconnect", (client) => {
    const s = sessions.get(client);
    if (s) deviceDisconnected(s.deviceId, s.conn).catch((e) => console.error("[mqtt]", e));
  });

  const server = createServer(broker.handle);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, resolve);
  });
  return server;
}
