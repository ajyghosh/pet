import {
  validateReminderList,
  validateScheduledReminder,
} from "./core/scheduledReminders";
import {
  validateCustomCharacter,
  assertUnicodeText,
  type CustomCharacter,
} from "./core/customCharacters";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { defaults, normalizeSettings, type Settings } from "./core/settings";
export const native = isTauri();
export interface Display {
  id: string;
  name: string;
  primary: boolean;
  scale: number;
  coordinateScale: number;
  bounds: { left: number; top: number; right: number; bottom: number };
  work: Display["bounds"];
  taskbar: string;
  autoHide: boolean;
}
const previewMonitor: Display = {
  id: "preview",
  name: "Browser preview",
  primary: true,
  scale: 1,
  coordinateScale: 1,
  bounds: { left: 0, top: 0, right: 1920, bottom: 1080 },
  work: { left: 0, top: 0, right: 1920, bottom: 1032 },
  taskbar: "bottom",
  autoHide: false,
};
export async function bootstrap(): Promise<{
  platform: string;
  clickEnabled: boolean;
  settings: Settings;
  warning: string | null;
}> {
  if (native) {
    const data =
      await invoke<Awaited<ReturnType<typeof bootstrap>>>("bootstrap");
    return { ...data, settings: normalizeSettings(data.settings) };
  }
  try {
    return {
      platform: "browser",
      clickEnabled: false,
      settings: normalizeSettings(
        JSON.parse(localStorage.getItem("miso.settings.v1") || "null"),
      ),
      warning: null,
    };
  } catch {
    return {
      platform: "browser",
      clickEnabled: false,
      settings: structuredClone(defaults),
      warning:
        "Saved browser settings could not be read. Defaults are shown; saving will replace them.",
    };
  }
}
export async function inputStatus(): Promise<boolean> {
  return native ? invoke("input_status") : false;
}
export async function desktopStatus(): Promise<string> {
  return native ? invoke("desktop_status") : "Browser preview";
}
export async function restartPet(): Promise<void> {
  if (native) await invoke("restart_pet");
}
export async function requestInputPermission(): Promise<boolean> {
  return native ? invoke("request_input_permission") : false;
}
export async function saveSettings(settings: Settings): Promise<Settings> {
  assertUnicodeText(settings);
  if (native) return invoke("save_settings", { settings });
  localStorage.setItem("miso.settings.v1", JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent("settings-changed", { detail: settings }),
  );
  return settings;
}
export async function monitors(): Promise<Display[]> {
  return native ? invoke("list_monitors") : [previewMonitor];
}
export async function action(action: string) {
  if (native) await invoke("pet_action", { action });
  else window.dispatchEvent(new CustomEvent("pet-action", { detail: action }));
}
export async function on<T>(
  event: string,
  callback: (value: T) => void,
): Promise<() => void> {
  if (native) return listen<T>(event, (e) => callback(e.payload));
  const listener = (e: Event) => callback((e as CustomEvent<T>).detail);
  window.addEventListener(event, listener);
  return () => window.removeEventListener(event, listener);
}

export async function exportPreset(
  character: CustomCharacter,
): Promise<string> {
  const valid = validateCustomCharacter(character);
  if (native) {
    const path = await invoke<string>("export_character", { character: valid });
    return `Exported to ${path}`;
  }
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(valid, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${valid.id}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "Preset downloaded.";
}

const remindersKey = "heykup-pets.reminders.v1";
export async function customReminders(): Promise<
  import("./core/scheduledReminders").ReminderSnapshot
> {
  if (native) return invoke("list_custom_reminders");
  return {
    reminders: validateReminderList(
      JSON.parse(localStorage.getItem(remindersKey) || "[]"),
    ),
    warning: null,
    snoozedUntil: 0,
  };
}
export async function saveCustomReminder(
  reminder: import("./core/scheduledReminders").ScheduledReminder,
) {
  const valid = validateScheduledReminder(reminder, true);
  if (native)
    return invoke<import("./core/scheduledReminders").ReminderSnapshot>(
      "save_custom_reminder",
      { reminder: valid },
    );
  const snapshot = await customReminders();
  const exists = snapshot.reminders.some((r) => r.id === valid.id);
  const reminders = validateReminderList(
    exists
      ? snapshot.reminders.map((r) => (r.id === valid.id ? valid : r))
      : [...snapshot.reminders, valid],
  );
  localStorage.setItem(remindersKey, JSON.stringify(reminders));
  return { ...snapshot, reminders };
}
export async function deleteCustomReminder(id: string) {
  if (native)
    return invoke<import("./core/scheduledReminders").ReminderSnapshot>(
      "delete_custom_reminder",
      { id },
    );
  const snapshot = await customReminders();
  snapshot.reminders = snapshot.reminders.filter((r) => r.id !== id);
  localStorage.setItem(remindersKey, JSON.stringify(snapshot.reminders));
  return snapshot;
}
export async function takeQuickReminderRequest(): Promise<boolean> {
  return native ? invoke("take_quick_reminder_request") : false;
}
export async function testNotification(): Promise<void> {
  if (native) await invoke("test_notification");
}
