import { useEffect, useRef, useState } from "react";
import {
  customReminders,
  deleteCustomReminder,
  native,
  on,
  saveCustomReminder,
  testNotification,
} from "../api";
import {
  localDateTime,
  newScheduledReminder,
  type ReminderSnapshot,
  type ScheduledReminder,
} from "../core/scheduledReminders";

export function CustomReminders({
  quickRequest = 0,
}: {
  quickRequest?: number;
}) {
  const [snapshot, setSnapshot] = useState<ReminderSnapshot>({
    reminders: [],
    warning: null,
    snoozedUntil: 0,
  });
  const [draft, setDraft] = useState<ScheduledReminder | null>(null);
  const [mode, setMode] = useState("quick");
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [when, setWhen] = useState(localDateTime(Date.now() + 15 * 60000));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    let off: (() => void) | undefined;
    void customReminders()
      .then((s) => {
        if (active) setSnapshot(s);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    void on<ReminderSnapshot>("custom-reminders-changed", (s) => {
      if (active) setSnapshot(s);
    }).then((fn) => {
      if (active) off = fn;
      else fn();
    });
    return () => {
      active = false;
      off?.();
    };
  }, []);
  function create() {
    const reminder = newScheduledReminder();
    setDraft(reminder);
    setWhen(localDateTime(reminder.dueAt));
    setRepeatEnabled(false);
    setMode("quick");
    setMinutes(15);
    setError("");
    setNotice("");
  }
  useEffect(() => {
    if (quickRequest > 0) create();
  }, [quickRequest]);
  useEffect(() => {
    if (draft) titleInput.current?.focus();
  }, [draft?.id]);
  async function save() {
    if (!draft) return;
    setBusy(true);
    setError("");
    try {
      const dueAt =
        mode === "quick"
          ? Date.now() + minutes * 60000
          : snapshot.reminders.some((r) => r.id === draft.id) &&
              when === localDateTime(draft.dueAt)
            ? draft.dueAt
            : new Date(when).getTime();
      if (
        mode === "quick" &&
        (!Number.isInteger(minutes) || minutes < 1 || minutes > 525600)
      )
        throw Error("Choose a delay between 1 and 525600 minutes.");
      if (
        repeatEnabled &&
        (!Number.isInteger(draft.repeatMinutes) || draft.repeatMinutes < 1)
      )
        throw Error("Choose a repeat interval of at least one minute.");
      setSnapshot(
        await saveCustomReminder({
          ...draft,
          dueAt,
          repeatMinutes: repeatEnabled ? draft.repeatMinutes : 0,
        }),
      );
      setDraft(null);
      setNotice("Reminder scheduled and saved on this device.");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    setBusy(true);
    try {
      setSnapshot(await deleteCustomReminder(id));
      setDeleting(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="settings-card custom-reminders"
      aria-label="Custom reminders"
    >
      <div className="section-heading">
        <div>
          <h2>Your reminders</h2>
          <p>A quick nudge now, or a reminder for later.</p>
        </div>
        <button
          className="primary-button"
          disabled={busy || snapshot.reminders.length >= 100}
          onClick={create}
        >
          Create reminder
        </button>
      </div>
      <p className="field-help">
        Right-click your companion or use the tray’s Quick reminder menu to open
        this form. Custom reminders save immediately. Keep the app running in
        the tray; overdue reminders run when you reopen it.
      </p>
      {!native && (
        <p className="field-help">
          Browser preview: reminders are stored here for editing. Delivery
          requires the installed desktop app.
        </p>
      )}
      <div className="reminder-actions">
        <button
          className="secondary-button"
          disabled={!native || busy}
          onClick={() => {
            void testNotification()
              .then(() =>
                setNotice(
                  "Test notification requested. Check your system notification settings and Focus mode if it does not appear.",
                ),
              )
              .catch((e) => setError(String(e)));
          }}
        >
          Test system notification
        </button>
      </div>
      {snapshot.warning && <p role="alert">{snapshot.warning}</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {draft && (
        <fieldset className="reminder-editor" disabled={busy}>
          <legend>
            {snapshot.reminders.some((r) => r.id === draft.id)
              ? "Edit reminder"
              : "New reminder"}
          </legend>
          <div className="reminder-form-fields">
            <label>
              Reminder title
              <input
                ref={titleInput}
                value={draft.title}
                maxLength={80}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              />
            </label>
            <label>
              Reminder message
              <input
                value={draft.message}
                maxLength={120}
                onChange={(e) =>
                  setDraft({ ...draft, message: e.target.value })
                }
              />
            </label>
            <label>
              When
              <select
                aria-label="Reminder timing"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
              >
                <option value="quick">After a delay</option>
                <option value="scheduled">At a date and time</option>
              </select>
            </label>
            {mode === "quick" ? (
              <label>
                Minutes from now
                <input
                  type="number"
                  min={1}
                  max={525600}
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                />
              </label>
            ) : (
              <label>
                Date and time
                <input
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                />
              </label>
            )}
            <label>
              Repeat
              <select
                aria-label="Reminder repeat"
                value={repeatEnabled ? "repeat" : "once"}
                onChange={(e) => {
                  setRepeatEnabled(e.target.value === "repeat");
                  if (e.target.value === "repeat" && !draft.repeatMinutes)
                    setDraft({ ...draft, repeatMinutes: 60 });
                }}
              >
                <option value="once">Once</option>
                <option value="repeat">Every interval</option>
              </select>
            </label>
            {repeatEnabled && (
              <label>
                Repeat every (minutes)
                <input
                  type="number"
                  min={1}
                  max={525600}
                  value={draft.repeatMinutes}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      repeatMinutes: Number(e.target.value),
                    })
                  }
                />
              </label>
            )}
          </div>
          {mode === "quick" && (
            <div className="reminder-actions">
              {[5, 15, 30, 60].map((n) => (
                <button
                  key={n}
                  className="secondary-button"
                  aria-pressed={minutes === n}
                  onClick={() => setMinutes(n)}
                >
                  In {n} minutes
                </button>
              ))}
            </div>
          )}
          <div className="reminder-actions">
            <label className="accessory-choice">
              <input
                type="checkbox"
                checked={draft.bubble}
                onChange={(e) =>
                  setDraft({ ...draft, bubble: e.target.checked })
                }
              />
              Speech bubble
            </label>
            <label className="accessory-choice">
              <input
                type="checkbox"
                checked={draft.systemNotification}
                onChange={(e) =>
                  setDraft({ ...draft, systemNotification: e.target.checked })
                }
              />
              System notification
            </label>
            <label className="accessory-choice">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) =>
                  setDraft({ ...draft, enabled: e.target.checked })
                }
              />
              Reminder enabled
            </label>
          </div>
          <p className="field-help">
            Times use this device’s local clock. Repeats use elapsed minute
            intervals. System settings and Focus modes can suppress
            notifications; speech bubbles follow your companion’s visibility and
            bubble preference.
          </p>
          <div className="reminder-actions">
            <button
              className="primary-button"
              onClick={() => {
                void save();
              }}
            >
              {busy ? "Scheduling…" : "Schedule reminder"}
            </button>
            <button className="text-button" onClick={() => setDraft(null)}>
              Cancel reminder
            </button>
          </div>
        </fieldset>
      )}
      {!snapshot.reminders.length && (
        <p className="field-help">No custom reminders yet.</p>
      )}
      <div className="custom-reminder-list">
        {snapshot.reminders.map((r) => (
          <article key={r.id} aria-label={`Reminder ${r.title}`}>
            <h3>{r.title}</h3>
            <p>{r.message}</p>
            <p className="field-help">
              {r.enabled
                ? new Date(r.dueAt).toLocaleString()
                : r.lastFiredAt
                  ? "Completed / paused"
                  : "Paused"}
              {r.repeatMinutes
                ? ` · Every ${r.repeatMinutes} minutes`
                : " · Once"}
              {r.lastFiredAt
                ? ` · Last alert attempted ${new Date(r.lastFiredAt).toLocaleString()}`
                : ""}
            </p>
            <div className="reminder-actions">
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  setDraft({ ...r });
                  setRepeatEnabled(r.repeatMinutes > 0);
                  setMode("scheduled");
                  setWhen(localDateTime(r.dueAt));
                  setError("");
                }}
              >
                Edit reminder
              </button>
              {r.enabled && (
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    setBusy(true);
                    void saveCustomReminder({ ...r, enabled: false })
                      .then(setSnapshot)
                      .catch((e) => setError(String(e)))
                      .finally(() => setBusy(false));
                  }}
                >
                  Pause reminder
                </button>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setDeleting(r.id)}
              >
                Delete reminder
              </button>
              {deleting === r.id && (
                <>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => {
                      void remove(r.id);
                    }}
                  >
                    Confirm delete reminder
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setDeleting(null)}
                  >
                    Keep reminder
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
