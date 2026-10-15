import { expect, it } from "vitest";
import {
  newScheduledReminder,
  localDateTime,
  validateScheduledReminder,
  validateReminderList,
} from "./scheduledReminders";
it("accepts future reminders and preserves local calendar time", () => {
  const r = {
    ...newScheduledReminder(),
    title: " Call ",
    message: " Join ",
    dueAt: Date.now() + 600000,
  };
  expect(validateScheduledReminder(r, true).title).toBe("Call");
  const stamp = new Date(2030, 5, 10, 14, 30).getTime();
  expect(new Date(localDateTime(stamp)).getTime()).toBe(stamp);
});
it("rejects unsafe schedules, duplicate IDs and malformed Unicode", () => {
  const r = { ...newScheduledReminder(), title: "Call", message: "Join" };
  for (const patch of [
    { dueAt: NaN },
    { dueAt: Date.now() - 1000 },
    { repeatMinutes: -1 },
    { bubble: false, systemNotification: false },
    { title: "broken\ud83d" },
    { lastFiredAt: -1 },
  ])
    expect(() => validateScheduledReminder({ ...r, ...patch }, true)).toThrow();
  expect(() => validateReminderList([r, r])).toThrow();
});
