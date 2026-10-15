import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { bootstrap, monitors, on, type Display } from "./api";
import { advance, createPet, interact } from "./core/engine";
import { ReminderClock } from "./core/reminders";
import { defaults, type Animation, type ReminderKind } from "./core/settings";
import { sprite, silhouette } from "./core/sprite";
import { PixelSprite } from "./components/PetSprite";

export function PetWindow() {
  const [runs, setRuns] = useState(() => sprite("idle", 0, "ginger"));
  const hover = useRef(false);
  const input = useRef<(action: string) => void>(() => {});
  useEffect(() => {
    let disposed = false,
      timer: ReturnType<typeof setTimeout> | undefined;
    const cleanups: (() => void)[] = [];
    const subscribe = async <T,>(event: string, cb: (data: T) => void) => {
      const off = await on(event, cb);
      if (disposed) off();
      else cleanups.push(off);
    };
    async function start() {
      let settings = (await bootstrap()).settings;
      let displays = await monitors();
      if (disposed) return;
      let pet = createPet(),
        last = performance.now(),
        nextMonitorCheck = last + 2000;
      pet.nextDecision = last + 4000;
      const clock = new ReminderClock(settings, last);
      let message: string | null =
          `Hello! I'm ${settings.name}. A little company for your day.`,
        messageUntil = last + 7000;
      const say = (text: string) => {
        message = text;
        messageUntil = performance.now() + 7000;
      };
      input.current = (a) => {
        const now = performance.now();
        if (a === "snooze") {
          clock.snooze(now);
          say("A little quiet time. Reminders snoozed for 15 minutes.");
          return;
        }
        if (a.startsWith("reminder:")) {
          say(settings.reminders[a.slice(9) as ReminderKind].message);
          return;
        }
        const animation = a === "wake" ? "idle" : (a as Animation);
        pet = interact(pet, animation, now);
        if (animation === "happy")
          say("A little head scratch makes a big difference. ♡");
        if (animation === "sleeping")
          say("Just resting my eyes. Click me when you need company.");
        if (animation === "jumping") say("A tiny leap of joy!");
      };
      await subscribe<typeof defaults>("settings-changed", (s) => {
        settings = s;
        clock.update(s, performance.now());
      });
      await subscribe<string>("pet-action", (a) => input.current(a));
      async function tick() {
        if (disposed) return;
        const now = performance.now();
        if (now >= nextMonitorCheck) {
          displays = await monitors();
          nextMonitorCheck = now + 2000;
        }
        if (disposed) return;
        const d: Display =
          displays.find((d) => d.id === settings.monitor) ??
          displays.find((d) => d.primary) ??
          displays[0];
        if (!d) throw new Error("No desktop monitor is available.");
        const width = (d.work.right - d.work.left) / d.scale;
        pet = advance(
          pet,
          now,
          hover.current ? 0 : (now - last) / 1000,
          width,
          settings,
        );
        last = now;
        const reminder = clock.tick(now);
        if (reminder) say(settings.reminders[reminder].message);
        if (now >= messageUntil) message = null;
        const nextRuns = sprite(
          pet.animation,
          Math.floor(now / 160),
          settings.coat,
          pet.direction,
        );
        setRuns(nextRuns);
        await invoke("present_frame", {
          frame: {
            x: pet.x,
            lift: pet.lift,
            rows: silhouette(nextRuns),
            message,
          },
        });
        if (!disposed)
          timer = setTimeout(() => {
            void tick().catch(fail);
          }, 33);
      }
      await tick();
    }
    async function fail(error: unknown) {
      if (disposed) return;
      // Fail closed: hide the overlay if monitor positioning or shape updates fail.
      await invoke("report_pet_error", {
        message: `Miso paused: ${String(error)}. Quit and reopen Miso to retry.`,
      }).catch(console.error);
    }
    void start().catch(fail);
    return () => {
      disposed = true;
      clearTimeout(timer);
      cleanups.forEach((off) => off());
    };
  }, []);
  return (
    <div
      className="native-pet"
      onPointerEnter={() => {
        hover.current = true;
      }}
      onPointerLeave={() => {
        hover.current = false;
      }}
      onClick={() => input.current("happy")}
      onDoubleClick={() => input.current("jumping")}
      onContextMenu={(e) => {
        e.preventDefault();
        void invoke("open_settings");
      }}
    >
      <PixelSprite runs={runs} />
    </div>
  );
}
export function BubbleWindow() {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false,
      off: (() => void) | undefined;
    void on<string | null>("bubble-message", setMessage).then(
      async (cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        off = cleanup;
        const current = await invoke<string | null>("bubble_message");
        if (!disposed) setMessage(current);
      },
    );
    return () => {
      disposed = true;
      off?.();
    };
  }, []);
  return message ? (
    <div className="native-bubble">
      <span>{message}</span>
    </div>
  ) : null;
}
