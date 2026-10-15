import { reminderKinds, type ReminderKind, type Settings } from "./settings";
/** Uses elapsed monotonic time. Missed intervals coalesce, never form a wake-up burst. */
export class ReminderClock {
  private due: Record<ReminderKind, number>;
  private settings: Settings;
  private snoozedUntil = 0;
  constructor(settings: Settings, now: number) {
    this.settings = settings;
    this.due = Object.fromEntries(
      reminderKinds.map((k) => [
        k,
        now + settings.reminders[k].minutes * 60000,
      ]),
    ) as Record<ReminderKind, number>;
  }
  update(settings: Settings, now: number) {
    for (const k of reminderKinds)
      if (
        JSON.stringify(settings.reminders[k]) !==
        JSON.stringify(this.settings.reminders[k])
      )
        this.due[k] = now + settings.reminders[k].minutes * 60000;
    this.settings = settings;
  }
  snooze(now: number, minutes = 15) {
    this.snoozedUntil = now + minutes * 60000;
  }
  tick(now: number): ReminderKind | null {
    if (now < this.snoozedUntil) return null;
    const overdue = reminderKinds.filter(
      (k) => this.settings.reminders[k].enabled && now >= this.due[k],
    );
    if (!overdue.length) return null;
    for (const k of overdue)
      this.due[k] = now + this.settings.reminders[k].minutes * 60000;
    return overdue[0];
  }
}
