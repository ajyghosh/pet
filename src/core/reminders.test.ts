import { describe, it, expect } from "vitest";
import { ReminderClock } from "./reminders";
import { defaults } from "./settings";
describe("gentle reminder scheduler", () => {
  it("fires at the configured interval, not on startup", () => {
    const clock = new ReminderClock(defaults, 100);
    expect(clock.tick(100)).toBeNull();
    expect(clock.tick(45 * 60000 + 99)).toBeNull();
    expect(clock.tick(45 * 60000 + 100)).toBe("water");
    expect(clock.tick(45 * 60000 + 101)).toBeNull();
  });
  it("coalesces all missed intervals after a long suspension", () => {
    const clock = new ReminderClock(defaults, 0);
    expect(clock.tick(24 * 3600000)).toBe("water");
    expect(clock.tick(24 * 3600000 + 1)).toBeNull();
  });
  it("honors snooze and disabled reminders", () => {
    const s = structuredClone(defaults);
    s.reminders.water.enabled = false;
    const clock = new ReminderClock(s, 0);
    expect(clock.tick(45 * 60000)).toBeNull();
    clock.snooze(59 * 60000);
    expect(clock.tick(60 * 60000)).toBeNull();
    expect(clock.tick(74 * 60000)).toBe("stretch");
  });
  it("keeps deadlines for appearance changes, restarts edited reminder deadlines", () => {
    const clock = new ReminderClock(defaults, 0);
    clock.update({ ...defaults, name: "Bean" }, 40 * 60000);
    expect(clock.tick(45 * 60000)).toBe("water");
    const s = structuredClone(defaults);
    s.reminders.stretch.minutes = 10;
    clock.update(s, 46 * 60000);
    expect(clock.tick(55 * 60000)).toBeNull();
    expect(clock.tick(56 * 60000)).toBe("stretch");
  });
});
