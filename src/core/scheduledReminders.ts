import { assertUnicodeText } from "./unicode";
export interface ScheduledReminder {
  id: string;
  title: string;
  message: string;
  dueAt: number;
  repeatMinutes: number;
  enabled: boolean;
  bubble: boolean;
  systemNotification: boolean;
  lastFiredAt: number | null;
}
export interface ReminderSnapshot {
  reminders: ScheduledReminder[];
  warning: string | null;
  snoozedUntil: number;
}
export function newScheduledReminder(): ScheduledReminder {
  return {
    id: `reminder-${crypto.randomUUID()}`,
    title: "",
    message: "",
    dueAt: Date.now() + 15 * 60000,
    repeatMinutes: 0,
    enabled: true,
    bubble: true,
    systemNotification: true,
    lastFiredAt: null,
  };
}
export function validateScheduledReminder(
  value: ScheduledReminder,
  future = false,
): ScheduledReminder {
  if (!value || typeof value !== "object")
    throw Error("Invalid reminder record.");
  assertUnicodeText(value);
  if (
    !/^reminder-[a-zA-Z0-9_-]{1,55}$/.test(value.id) ||
    !value.title.trim() ||
    [...value.title].length > 80 ||
    !value.message.trim() ||
    [...value.message].length > 120
  )
    throw Error("Enter a title (up to 80 characters) and message (up to 120).");
  if (
    !Number.isSafeInteger(value.dueAt) ||
    value.dueAt < 1 ||
    value.dueAt > 4102444800000 ||
    !Number.isInteger(value.repeatMinutes) ||
    value.repeatMinutes < 0 ||
    value.repeatMinutes > 525600 ||
    [value.enabled, value.bubble, value.systemNotification].some(
      (v) => typeof v !== "boolean",
    ) ||
    (value.lastFiredAt !== null &&
      (!Number.isSafeInteger(value.lastFiredAt) ||
        value.lastFiredAt < 1 ||
        value.lastFiredAt > 4102444800000)) ||
    (!value.bubble && !value.systemNotification)
  )
    throw Error(
      "Choose a valid time, repeat interval and at least one alert method.",
    );
  if (future && value.enabled && value.dueAt <= Date.now())
    throw Error("Choose a future reminder time.");
  return { ...value, title: value.title.trim(), message: value.message.trim() };
}
export function validateReminderList(
  records: ScheduledReminder[],
): ScheduledReminder[] {
  if (!Array.isArray(records) || records.length > 100)
    throw Error("You can save up to 100 custom reminders.");
  const list = records.map((r) => validateScheduledReminder(r));
  if (new Set(list.map((r) => r.id)).size !== list.length)
    throw Error("Duplicate reminder IDs.");
  return list;
}
/** datetime-local uses the device's current local zone; storage uses epoch milliseconds. */
export function localDateTime(timestamp: number) {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
