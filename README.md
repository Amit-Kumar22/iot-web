# IoT Platform

A self-hosted platform for connecting ESP32 / ESP8266 / Arduino devices and controlling them from the web, similar in spirit to Blynk. Widgets are fixed per datastream type, with no drag-and-drop builder.

- **Website + REST API**: Next.js 16 (App Router)
- **Realtime**: WebSocket (`/ws/app`, `/ws/device`) and a built-in MQTT broker (Aedes)
- **Database**: MongoDB (Mongoose)
- **Auth**: email + password, JWT Bearer tokens (the same API works for the website and a mobile app)

Everything runs in **one Node process** (`server.ts`), sharing an in-process event bus. A switch flipped on the website reaches an MQTT device instantly, and a sensor value sent over HTTP shows up live on every open dashboard.

## Features

| | |
|---|---|
| Devices | Create devices; each gets a 32-char auth token (regenerating it kicks old connections) |
| Datastreams | Virtual pins `V0`–`V255`, typed `switch`, `slider` or `value` |
| Dashboard | Fixed widget per type: toggle, slider, live readout |
| Online status | Live for WebSocket/MQTT; HTTP devices count as online for 60 s after the last request |
| History | Every numeric value is stored; charts for 1h / 6h / 24h / 7d / 30d (auto-deleted after `HISTORY_RETENTION_DAYS`) |
| Automations | `If <pin> > / ≥ / < / ≤ / = / ≠ <value>` → send a notification **or** set another pin. Edge-triggered with cooldown |
| Schedules | `At HH:MM on <days> → set <pin> to <value>` (e.g. light ON every day 7 PM). Runs on the server every 20 s in the creator's time zone, so phones/browsers can be closed. Owners and operators can create them; a failed run notifies everyone with access |
| Notifications | Stored per user, pushed live (bell + toast). Also sent as **phone push** (Expo Push Service) to every phone signed in to the mobile app |
| Sharing | Share a device by email as **viewer** (read-only) or **operator** (can control). Only the owner edits settings |
| App config | Admins edit the mobile app's offline *Home Automation* buttons (name, icon, ON/OFF paths, order). Apps download the list on start, so no new APK is needed |

## Run locally

```bash
cp .env.example .env.local      # then set JWT_SECRET (and MONGODB_URI if needed)
npm install
npm run dev                     # http://localhost:5010, MQTT on 1883
```

Requires Node 20+ and a running MongoDB.

| Script | |
|---|---|
| `npm run dev` | dev server with hot reload |
| `npm run build` | production build |
| `npm start` | production server (`NODE_ENV=production tsx server.ts`) |
| `npm run lint` / `npm run typecheck` | checks |

## Configuration (`.env.local`)

| Variable | Default | |
|---|---|---|
| `MONGODB_URI` | — | e.g. `mongodb://127.0.0.1:27017/iot-platform` |
| `JWT_SECRET` | — | ≥ 32 random chars. Changing it logs everyone out |
| `PORT` | `5010` | website + API + WebSocket |
| `MQTT_PORT` / `MQTT_ENABLED` | `1883` / `true` | MQTT broker for devices |
| `ADMIN_EMAILS` | empty | comma-separated emails that can open **App config** |
| `CORS_ORIGIN` | `*` | origins allowed to call `/api` from a browser (comma-separated) |
| `HISTORY_RETENTION_DAYS` | `30` | readings and notifications TTL |
| `NEXT_PUBLIC_API_URL` | empty | backend base URL the website calls. Empty = same server. **Build-time**: rebuild after changing |
| `NEXT_PUBLIC_MQTT_PORT` | `1883` | shown on the device Setup tab |

## Deploy to the VPS

Ports already used on the server are left alone. This app uses **5010** (web/API/WS) and **1883** (MQTT), and the existing MongoDB on `127.0.0.1:27017`.

```bash
# on the server
git clone <your-repo-url> iot-platform && cd iot-platform
npm ci
cp .env.example .env.local
nano .env.local                 # set JWT_SECRET; MONGODB_URI stays 127.0.0.1:27017
npm run build

npm install -g pm2
pm2 start npm --name iot-platform -- start
pm2 save && pm2 startup         # restart on reboot

# open the ports if a firewall (ufw) is active
ufw allow 5010/tcp
ufw allow 1883/tcp
```

The site is then at `http://<server-ip>:5010`. Update with `git pull && npm ci && npm run build && pm2 restart iot-platform`.

**Hosting the website separately:** set `NEXT_PUBLIC_API_URL=http://<server-ip>:5010` when building the website, and restrict `CORS_ORIGIN` on the backend to the website's origin.

> HTTPS (optional, later): plain `http://` and `mqtt://` send tokens unencrypted. For production, put a domain with TLS in front of port 5010 and use MQTTS.

## Connecting hardware

Each device's **Setup** tab shows its token and copy-ready connection details. Ready-to-flash sketches:

- [`firmware/esp32_mqtt`](firmware/esp32_mqtt/esp32_mqtt.ino): instant two-way (needs the *PubSubClient* library)
- [`firmware/esp32_http`](firmware/esp32_http/esp32_http.ino): simplest, polling, no extra libraries

### MQTT
| | |
|---|---|
| Connect | host `<server>`, port `1883`, username: anything, **password: device token** |
| Send | publish `up/V1`, payload `23.5` |
| Receive | subscribe `down/#`; messages arrive on `dev/<deviceId>/down/V0`, payload `1` (pin = text after the last `/`) |

Topics are private per device. After subscribing, the server sends every current value once so the device can restore its state after a reboot.

### WebSocket
`ws://<server>:5010/ws/device?token=<token>`: send `{"pin":"V1","value":23.5}` (or `{"V1":23.5,"V2":1}`), receive `{"pin":"V0","value":1}`.

### HTTP
```
GET  /api/external/update?token=T&V1=23.5&V2=1     device → server
POST /api/external/update?token=T   {"V1":23.5}
GET  /api/external/get?token=T&V0                  plain-text value
GET  /api/external/get?token=T                     all values as JSON
GET  /api/external/isHardwareConnected?token=T     "true" / "false"
```

## App API (website / mobile app)

All endpoints take and return JSON. Send `Authorization: Bearer <token>` (from login/signup). Errors are `{ "error": "message" }` with a matching status code.

| Method | Path | Access | |
|---|---|---|---|
| POST | `/api/auth/signup` | — | `{name,email,password}` → `{user, token}` |
| POST | `/api/auth/login` | — | `{email,password}` → `{user, token}` |
| GET | `/api/auth/me` | user | `{user, unreadNotifications}` |
| GET / POST | `/api/devices` | user | list / create `{name, description?, datastreams?}` |
| GET / PATCH / DELETE | `/api/devices/:id` | viewer / owner / owner | |
| POST | `/api/devices/:id/token` | owner | new auth token |
| POST | `/api/devices/:id/datastreams` | owner | `{pin,name,kind,min,max,step,unit}` |
| PATCH / DELETE | `/api/devices/:id/datastreams/:pin` | owner | |
| POST | `/api/devices/:id/write` | operator | `{pin, value}` |
| GET | `/api/devices/:id/history?pin=V1&range=24h` | viewer | `1h·6h·24h·7d·30d`, ~120 averaged points |
| GET / POST | `/api/devices/:id/automations` | viewer / owner | |
| PATCH / DELETE | `/api/automations/:id` | owner | |
| POST | `/api/devices/:id/shares` | owner | `{email, role: viewer\|operator}` |
| DELETE | `/api/devices/:id/shares/:userId` | owner, or that user | |
| GET | `/api/notifications` | user | last 100 |
| GET | `/api/app-config` | public | mobile app's Home Automation appliance list + `version` |
| PUT | `/api/admin/app-config` | admin | `{appliances:[{id,name,icon,on,off,altNames}]}` |
| POST | `/api/notifications/read` | user | mark all read |

`/api/auth/me` also returns `user.isAdmin`.

**Appliance icons** are a contract with the app: the names in `src/lib/appliance-icons.ts` must also exist in `robotics-trainer/src/components/ApplianceIcon.tsx`. Add a new name to the app first and ship it, then add it here.

**Live updates:** connect to `ws://<server>:5010/ws/app` and send `{"type":"auth","token":"<token>"}`, wait for `{"type":"ready"}`, then `{"type":"subscribe","deviceIds":[...]}`. You receive `pin`, `status` and `notification` messages.

## Project layout

```
server.ts               one process: Next.js + WebSocket + MQTT
src/app/                pages and /api route handlers
src/components/         UI
src/lib/                models, auth, access rules, core write path (core.ts), validation
src/lib/client/         browser-side API client, realtime hook, types
src/realtime/           device connection hub, WebSocket and MQTT servers
firmware/               ESP32 example sketches
```
# iot-web
