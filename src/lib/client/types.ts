// Shapes returned by the REST API (see src/lib/core.ts deviceJSON etc.)

export type Role = "owner" | "operator" | "viewer";
export type DatastreamKind = "switch" | "slider" | "value";
export type PinValue = number | string | null;

export interface Datastream {
  pin: string;
  name: string;
  kind: DatastreamKind;
  min: number;
  max: number;
  step: number;
  unit: string;
  value: PinValue;
  updatedAt: string | null;
}

export interface Share {
  userId: string;
  email: string | null;
  name: string | null;
  role: "viewer" | "operator";
}

export interface Device {
  id: string;
  name: string;
  description: string;
  role: Role;
  online: boolean;
  connected: boolean;
  lastSeen: string | null;
  onlineWindowMs: number;
  datastreams: Datastream[];
  token?: string;
  shares?: Share[];
  createdAt: string | null;
}

export type AutomationOp = "gt" | "gte" | "lt" | "lte" | "eq" | "neq";

export interface Automation {
  id: string;
  deviceId: string;
  name: string;
  pin: string;
  op: AutomationOp;
  threshold: number;
  action: { type: "notify"; message: string } | { type: "setPin"; pin: string; value: PinValue };
  enabled: boolean;
  cooldownSec: number;
  lastTriggeredAt: string | null;
}

export interface Schedule {
  id: string;
  deviceId: string;
  name: string;
  pin: string;
  value: PinValue;
  /** "HH:MM", 24-hour, in `timezone` */
  time: string;
  /** 0 = Sunday … 6 = Saturday */
  days: number[];
  timezone: string;
  enabled: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  nextRunAt: string | null;
}

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface AppNotification {
  id?: string;
  deviceId: string | null;
  title: string;
  message: string;
  read?: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

export interface ApplianceConfig {
  id: string;
  name: string;
  icon: string;
  paths: { on: string; off: string };
  altNames: string[];
}

export interface AppConfigResponse {
  version: number;
  updatedAt: string | null;
  appliances: ApplianceConfig[];
}

export const OP_LABELS: Record<AutomationOp, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  neq: "≠",
};
