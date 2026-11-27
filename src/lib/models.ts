import mongoose, { Schema, model, type HydratedDocument, type Model, type Types } from "mongoose";

// Explicit interfaces (instead of InferSchemaType) keep TypeScript fast.

const HISTORY_DAYS = Number(process.env.HISTORY_RETENTION_DAYS || 30);

export const DATASTREAM_KINDS = ["switch", "slider", "value"] as const;
export type DatastreamKind = (typeof DATASTREAM_KINDS)[number];
export const SHARE_ROLES = ["viewer", "operator"] as const;
export type ShareRole = (typeof SHARE_ROLES)[number];
export const AUTOMATION_OPS = ["gt", "gte", "lt", "lte", "eq", "neq"] as const;
export type AutomationOp = (typeof AUTOMATION_OPS)[number];

export type PinValue = number | string | null;

/* ----------------------------------------------------------------- User */

export interface UserT {
  email: string;
  name: string;
  passwordHash: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const UserSchema = new Schema<UserT>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true },
);

/* --------------------------------------------------------------- Device */

export interface DatastreamT {
  pin: string; // "V0" .. "V255"
  name: string;
  kind: DatastreamKind;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: PinValue;
  updatedAt: Date | null;
}

export interface ShareT {
  user: Types.ObjectId;
  role: ShareRole;
}

export interface DeviceT {
  owner: Types.ObjectId;
  name: string;
  description: string;
  token: string;
  datastreams: Types.DocumentArray<DatastreamT>;
  shares: Types.DocumentArray<ShareT>;
  lastSeen: Date | null;
  /** true while at least one WebSocket/MQTT connection is open */
  connected: boolean;
  /** when the last WebSocket/MQTT connection closed (so it shows offline immediately) */
  disconnectedAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const DatastreamSchema = new Schema<DatastreamT>(
  {
    pin: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    kind: { type: String, enum: DATASTREAM_KINDS, default: "value" },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    unit: { type: String, default: "" },
    value: { type: Schema.Types.Mixed, default: null },
    updatedAt: { type: Date, default: null },
  },
  { _id: false },
);

const ShareSchema = new Schema<ShareT>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: SHARE_ROLES, default: "viewer" },
  },
  { _id: false },
);

const DeviceSchema = new Schema<DeviceT>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    token: { type: String, required: true, unique: true },
    datastreams: { type: [DatastreamSchema], default: [] },
    shares: { type: [ShareSchema], default: [] },
    lastSeen: { type: Date, default: null },
    connected: { type: Boolean, default: false },
    disconnectedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
DeviceSchema.index({ "shares.user": 1 });

export type DeviceDoc = HydratedDocument<DeviceT>;

/* -------------------------------------------------------------- Reading */

export interface ReadingT {
  device: Types.ObjectId;
  pin: string;
  value: number;
  ts: Date;
}

const ReadingSchema = new Schema<ReadingT>({
  device: { type: Schema.Types.ObjectId, ref: "Device", required: true },
  pin: { type: String, required: true },
  value: { type: Number, required: true },
  ts: { type: Date, required: true, default: () => new Date() },
});
ReadingSchema.index({ device: 1, pin: 1, ts: -1 });
ReadingSchema.index({ ts: 1 }, { expireAfterSeconds: HISTORY_DAYS * 86400 });

/* ----------------------------------------------------------- Automation */

export interface AutomationActionT {
  type: "notify" | "setPin";
  message: string;
  pin: string | null;
  value: PinValue;
}

export interface AutomationT {
  owner: Types.ObjectId;
  device: Types.ObjectId;
  name: string;
  pin: string;
  op: AutomationOp;
  threshold: number;
  action: AutomationActionT;
  enabled: boolean;
  cooldownSec: number;
  /** Edge-triggered: fires when the condition turns true, re-arms when it turns false. */
  conditionMet: boolean;
  lastTriggeredAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

const AutomationSchema = new Schema<AutomationT>(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    device: { type: Schema.Types.ObjectId, ref: "Device", required: true, index: true },
    name: { type: String, required: true, trim: true },
    pin: { type: String, required: true },
    op: { type: String, enum: AUTOMATION_OPS, required: true },
    threshold: { type: Number, required: true },
    action: {
      // `type: { type: String }` declares a field literally named "type"
      type: { type: String, enum: ["notify", "setPin"], required: true },
      message: { type: String, default: "" },
      pin: { type: String, default: null },
      value: { type: Schema.Types.Mixed, default: null },
    },
    enabled: { type: Boolean, default: true },
    cooldownSec: { type: Number, default: 60 },
    conditionMet: { type: Boolean, default: false },
    lastTriggeredAt: { type: Date, default: null },
  },
  { timestamps: true },
);
export type AutomationDoc = HydratedDocument<AutomationT>;

/* --------------------------------------------------------- Notification */

export interface NotificationT {
  user: Types.ObjectId;
  device: Types.ObjectId | null;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<NotificationT>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  device: { type: Schema.Types.ObjectId, ref: "Device", default: null },
  title: { type: String, required: true },
  message: { type: String, default: "" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: () => new Date() },
});
NotificationSchema.index({ user: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: HISTORY_DAYS * 86400 });

/* ---------------------------------------------------------------------- */

function getModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? model<T>(name, schema);
}

export const User = getModel<UserT>("User", UserSchema);
export const Device = getModel<DeviceT>("Device", DeviceSchema);
export const Reading = getModel<ReadingT>("Reading", ReadingSchema);
export const Automation = getModel<AutomationT>("Automation", AutomationSchema);
export const Notification = getModel<NotificationT>("Notification", NotificationSchema);
