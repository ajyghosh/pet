import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { defaults, normalizeSettings, type Settings } from "./core/settings";
export const native = isTauri();
export interface Display {
  id: string;
  name: string;
  primary: boolean;
  scale: number;
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
  bounds: { left: 0, top: 0, right: 1920, bottom: 1080 },
  work: { left: 0, top: 0, right: 1920, bottom: 1032 },
  taskbar: "bottom",
  autoHide: false,
};
export async function bootstrap(): Promise<{
  settings: Settings;
  warning: string | null;
}> {
  if (native) return invoke("bootstrap");
  try {
    return {
      settings: normalizeSettings(
        JSON.parse(localStorage.getItem("miso.settings.v1") || "null"),
      ),
      warning: null,
    };
  } catch {
    return {
      settings: structuredClone(defaults),
      warning:
        "Saved browser settings could not be read. Defaults are shown; saving will replace them.",
    };
  }
}
export async function saveSettings(settings: Settings): Promise<Settings> {
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
