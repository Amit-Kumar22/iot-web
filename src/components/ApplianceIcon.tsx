import {
  AirVent, Bell, Blinds, Camera, CookingPot, Cog, Cpu, DoorOpen, Droplets, Fan, Flame, Gauge, Heater, Lamp,
  LampCeiling, LampDesk, Lightbulb, Lock, Microwave, Monitor, Moon, Plug, PlugZap, Power, Refrigerator, Router,
  ShowerHead, Siren, Speaker, Sprout, Sun, Thermometer, Tv, WashingMachine, Waves, Wifi, Wind, Zap,
  type LucideIcon,
} from "lucide-react";
import type { ApplianceIconName } from "@/lib/appliance-icons";

/** Must match robotics-trainer/src/components/ApplianceIcon.tsx (same names → same Lucide icons). */
export const APPLIANCE_ICONS: Record<ApplianceIconName, LucideIcon> = {
  bulb: Lightbulb,
  lamp: Lamp,
  "lamp-desk": LampDesk,
  "lamp-ceiling": LampCeiling,
  fan: Fan,
  ac: AirVent,
  heater: Heater,
  tv: Tv,
  monitor: Monitor,
  speaker: Speaker,
  plug: Plug,
  socket: PlugZap,
  power: Power,
  fridge: Refrigerator,
  washer: WashingMachine,
  microwave: Microwave,
  cooker: CookingPot,
  water: Droplets,
  geyser: ShowerHead,
  pump: Waves,
  door: DoorOpen,
  lock: Lock,
  bell: Bell,
  alarm: Siren,
  camera: Camera,
  router: Router,
  wifi: Wifi,
  blinds: Blinds,
  sun: Sun,
  moon: Moon,
  plant: Sprout,
  motor: Cog,
  cpu: Cpu,
  gauge: Gauge,
  thermometer: Thermometer,
  wind: Wind,
  flame: Flame,
  zap: Zap,
};

export function ApplianceIcon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  const Icon = APPLIANCE_ICONS[name as ApplianceIconName] ?? Power;
  return <Icon size={size} className={className} aria-hidden />;
}
