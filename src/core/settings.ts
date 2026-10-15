export const reminderKinds = ["water", "stretch", "break"] as const;
export type ReminderKind = (typeof reminderKinds)[number];
export type Animation = "idle" | "walking" | "sleeping" | "jumping" | "happy";
export type Coat = "ginger" | "cream" | "slate";
export interface Reminder {
  enabled: boolean;
  minutes: number;
  message: string;
}
export interface Settings {
  version: 1;
  name: string;
  coat: Coat;
  size: number;
  speed: number;
  monitor: string;
  autostart: boolean;
  roaming: boolean;
  bubbles: boolean;
  reminders: Record<ReminderKind, Reminder>;
}
export const defaults: Settings = {
  version: 1,
  name: "Miso",
  coat: "ginger",
  size: 128,
  speed: 45,
  monitor: "primary",
  autostart: false,
  roaming: true,
  bubbles: true,
  reminders: {
    water: {
      enabled: true,
      minutes: 45,
      message: "A little sip? Your water is waiting.",
    },
    stretch: {
      enabled: true,
      minutes: 60,
      message: "Reach up, roll your shoulders, breathe.",
    },
    break: {
      enabled: true,
      minutes: 90,
      message: "Time for a tiny break. Look somewhere far away.",
    },
  },
};
const record = (x: unknown): Record<string, unknown> =>
  x && typeof x === "object" ? (x as Record<string, unknown>) : {};
const num = (x: unknown, fallback: number, lo: number, hi: number) =>
  typeof x === "number" && Number.isFinite(x)
    ? Math.round(Math.max(lo, Math.min(hi, x)))
    : fallback;
const bool = (x: unknown, fallback: boolean) =>
  typeof x === "boolean" ? x : fallback;
const str = (x: unknown, fallback: string, length: number) =>
  typeof x === "string" && x.trim() ? x.trim().slice(0, length) : fallback;
export function normalizeSettings(value: unknown): Settings {
  const v = record(value),
    reminders = record(v.reminders);
  return {
    version: 1,
    name: str(v.name, defaults.name, 24),
    coat: ["ginger", "cream", "slate"].includes(String(v.coat))
      ? (v.coat as Coat)
      : defaults.coat,
    size: [96, 128, 160].includes(Number(v.size))
      ? Number(v.size)
      : defaults.size,
    speed: num(v.speed, defaults.speed, 10, 100),
    monitor: str(v.monitor, "primary", 128),
    autostart: bool(v.autostart, false),
    roaming: bool(v.roaming, true),
    bubbles: bool(v.bubbles, true),
    reminders: Object.fromEntries(
      reminderKinds.map((kind) => {
        const r = record(reminders[kind]),
          d = defaults.reminders[kind];
        return [
          kind,
          {
            enabled: bool(r.enabled, d.enabled),
            minutes: num(r.minutes, d.minutes, 1, 240),
            message: str(r.message, d.message, 120),
          },
        ];
      }),
    ) as Settings["reminders"],
  };
}
