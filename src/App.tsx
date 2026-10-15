import { useEffect, useState } from "react";
import {
  Bell,
  Check,
  ChevronRight,
  Coffee,
  Droplets,
  Heart,
  Info,
  Leaf,
  Monitor,
  Moon,
  MousePointer2,
  Palette,
  PawPrint,
  Play,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  VolumeX,
  X,
} from "lucide-react";
import {
  action,
  bootstrap,
  monitors,
  native,
  on,
  saveSettings,
  type Display,
} from "./api";
import {
  defaults,
  reminderKinds,
  type Animation,
  type Coat,
  type ReminderKind,
  type Settings,
} from "./core/settings";
import { PetSprite } from "./components/PetSprite";

type Tab = "companion" | "reminders" | "appearance" | "desktop" | "about";
const reminderMeta = {
  water: {
    title: "Stay hydrated",
    text: "A small sip goes a long way.",
    icon: Droplets,
    className: "water",
  },
  stretch: {
    title: "Stretch a little",
    text: "Give your shoulders some love.",
    icon: Sprout,
    className: "stretch",
  },
  break: {
    title: "Take a breather",
    text: "Step away. Come back fresh.",
    icon: Coffee,
    className: "break",
  },
};
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={`toggle ${checked ? "on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
export default function App() {
  const [tab, setTab] = useState<Tab>("companion");
  const [settings, setSettings] = useState<Settings>(structuredClone(defaults));
  const [saved, setSaved] = useState<Settings>(structuredClone(defaults));
  const [displays, setDisplays] = useState<Display[]>([]);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [animation, setAnimation] = useState<Animation>("idle"),
    [frame, setFrame] = useState(0);
  const [previewMessage, setPreviewMessage] = useState(
    "A little company. A better day.",
  );
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  useEffect(() => {
    let active = true;
    let off: (() => void) | undefined;
    void bootstrap()
      .then((data) => {
        if (active) {
          setSettings(data.settings);
          setSaved(data.settings);
          setError(data.warning ?? "");
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    const refresh = () => {
      void monitors()
        .then((d) => {
          if (active) setDisplays(d);
        })
        .catch((e) => {
          if (active) setError(String(e));
        });
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    void on<string>("native-error", setError).then((cleanup) => {
      if (!active) cleanup();
      else off = cleanup;
    });
    return () => {
      active = false;
      clearInterval(timer);
      off?.();
    };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => f + 1), 160);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (animation === "idle" || animation === "sleeping") return;
    const t = setTimeout(() => setAnimation("idle"), 3000);
    return () => clearTimeout(t);
  }, [animation]);
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setSettings((s) => ({ ...s, [key]: value }));
  const reminder = (
    kind: ReminderKind,
    update: Partial<Settings["reminders"][ReminderKind]>,
  ) =>
    setSettings((s) => ({
      ...s,
      reminders: {
        ...s.reminders,
        [kind]: { ...s.reminders[kind], ...update },
      },
    }));
  async function save() {
    setBusy(true);
    setError("");
    try {
      const s = await saveSettings(settings);
      setSettings(s);
      setSaved(s);
      setNotice(
        native
          ? "All settled. Your settings are saved on this device."
          : "Saved in this browser.",
      );
    } catch (e) {
      setError(`Couldn't save your settings: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function play(a: Animation | "snooze" | "wake") {
    if (a === "snooze") {
      setNotice("Reminders snoozed for 15 minutes.");
      setPreviewMessage("A little quiet time. You’ve earned it.");
    } else {
      setAnimation(a === "wake" ? "idle" : a);
      setPreviewMessage(
        a === "sleeping"
          ? "Just resting my eyes…"
          : a === "jumping"
            ? "A tiny leap of joy!"
            : a === "happy"
              ? "That’s the spot. ♡"
              : "Here for the little moments.",
      );
    }
    try {
      await action(a);
    } catch (e) {
      setError(String(e));
    }
  }
  async function testReminder(k: ReminderKind) {
    setPreviewMessage(settings.reminders[k].message);
    setNotice(settings.reminders[k].message);
    try {
      if (native && dirty) {
        setNotice(
          "Save your changes first to test the updated reminder on your desktop.",
        );
        return;
      }
      await action(`reminder:${k}`);
    } catch (e) {
      setError(String(e));
    }
  }
  const currentDisplay =
    displays.find((d) => d.id === settings.monitor) ??
    displays.find((d) => d.primary);
  const title = {
    companion: "A little company for your day.",
    reminders: "Small pauses. Big difference.",
    appearance: "Make yourself at home.",
    desktop: "A good desktop neighbor.",
    about: "Small by design.",
  }[tab];
  const subtitle = {
    companion:
      "Meet your desk buddy. Here to wander, nap, and look out for you.",
    reminders: "Gentle nudges to take care of the person behind the screen.",
    appearance: "A familiar little face, with a personality of your own.",
    desktop: "Settle in on the right screen, and stay out of the way.",
    about: "A quiet companion. All yours, all offline.",
  }[tab];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("companion");
          }}
        >
          <span className="brand-cat">
            <PetSprite />
          </span>
          <span>
            miso<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="sidebar-caption">A LITTLE COMPANY</div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "companion", label: "My companion", icon: PawPrint },
              { id: "reminders", label: "Gentle reminders", icon: Bell },
              { id: "appearance", label: "Appearance", icon: Palette },
              { id: "desktop", label: "Desktop & startup", icon: Monitor },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={`nav-item ${tab === n.id ? "selected" : ""}`}
              onClick={() => setTab(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {tab === n.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-note">
            <span className="offline-icon">
              <Leaf size={18} />
            </span>
            <div>
              Happy here. Offline.<small>No accounts. Just company.</small>
            </div>
          </div>
          <button
            className={`nav-item ${tab === "about" ? "selected" : ""}`}
            onClick={() => setTab("about")}
          >
            <Info size={17} /> About Miso <span className="version">v1.0</span>
          </button>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>YOUR DESKTOP, A LITTLE WARMER</span>
          <span className="connection">
            <i />
            {native ? "On your desktop" : "Browser preview"}
          </span>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <span className="sun-mark">
              <Sun size={28} strokeWidth={1.3} />
            </span>
          </div>
          {!native && (
            <div className="preview-note">
              <Monitor size={14} />
              <span>
                You’re in the browser preview. The Windows app adds taskbar
                roaming, tray controls, and startup.
              </span>
            </div>
          )}
          {error && (
            <div className="error-banner" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {(tab === "companion" || tab === "appearance") && (
            <section className="companion-card" aria-label="Companion preview">
              <div className="scene">
                <span className="scene-label">
                  <span /> A MOMENT WITH {settings.name.toUpperCase()}
                </span>
                <svg
                  className="scene-art"
                  viewBox="0 0 760 240"
                  preserveAspectRatio="xMidYMax slice"
                  aria-hidden="true"
                >
                  <circle cx="630" cy="42" r="50" fill="#e8eacb" />
                  <path
                    d="M0 200Q100 145 220 203T460 202T760 180V260H0"
                    fill="#dbe6d6"
                  />
                  <path
                    d="M0 226Q150 183 350 221T760 212V260H0"
                    fill="#d0dfcc"
                  />
                  <g stroke="#93ab8c" strokeWidth="2" fill="none">
                    <path d="M82 232v-39m0 19q-22-1-22-17 23 0 22 17m0-9q21 0 21-16-19 0-21 16M669 232v-42m0 22q-19-1-19-18 20 1 19 18m0-9q22 0 23-17-22 0-23 17" />
                  </g>
                  <g fill="#a9bba1">
                    <rect x="132" y="226" width="3" height="6" />
                    <rect x="139" y="223" width="3" height="9" />
                    <rect x="591" y="228" width="3" height="5" />
                  </g>
                </svg>
                <div className="preview-bubble">
                  {previewMessage}
                  <span>✦</span>
                </div>
                <button
                  aria-label="Pet your companion"
                  className={`preview-pet ${animation}`}
                  onClick={() => void play("happy")}
                  style={{ width: settings.size }}
                >
                  <PetSprite
                    animation={animation}
                    frame={frame}
                    coat={settings.coat}
                  />
                </button>
                <span className="scene-hint">
                  <MousePointer2 size={12} /> a little head scratch?
                </span>
              </div>
              <div className="companion-details">
                <div className="pet-id">
                  <span className="pet-avatar">
                    <PetSprite coat={settings.coat} />
                  </span>
                  <div>
                    <h2>
                      {settings.name}
                      <span className="pet-tag">YOUR COMPANION</span>
                    </h2>
                    <p>
                      <i />
                      {animation === "sleeping"
                        ? "Dreaming of very small adventures"
                        : "Feeling right at home"}
                    </p>
                  </div>
                </div>
                <div className="pet-actions">
                  <button
                    onClick={() =>
                      void play(animation === "sleeping" ? "wake" : "sleeping")
                    }
                  >
                    <Moon size={15} />
                    {animation === "sleeping" ? "Wake up" : "Nap time"}
                  </button>
                  <button onClick={() => void play("jumping")}>
                    <Sparkles size={15} />
                    Let’s play
                  </button>
                </div>
              </div>
            </section>
          )}
          {(tab === "companion" || tab === "reminders") && (
            <section className="reminders-section">
              <div className="section-heading">
                <div>
                  <h2>
                    Little reminders, just for you{" "}
                    <span className="count">
                      {
                        reminderKinds.filter(
                          (k) => settings.reminders[k].enabled,
                        ).length
                      }{" "}
                      ON
                    </span>
                  </h2>
                  <p>
                    A friendly nudge when you need it. Never a loud
                    interruption.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => void play("snooze")}
                >
                  <VolumeX size={14} />
                  Snooze 15 min
                </button>
              </div>
              <div className="reminder-grid">
                {reminderKinds.map((k) => {
                  const meta = reminderMeta[k],
                    r = settings.reminders[k];
                  return (
                    <article
                      className={`reminder-card ${!r.enabled ? "disabled-card" : ""}`}
                      key={k}
                    >
                      <div className="reminder-top">
                        <span className={`reminder-icon ${meta.className}`}>
                          <meta.icon size={21} strokeWidth={1.6} />
                        </span>
                        <Toggle
                          checked={r.enabled}
                          label={`${meta.title} reminder`}
                          onChange={(v) => reminder(k, { enabled: v })}
                        />
                      </div>
                      <h3>{meta.title}</h3>
                      <p>{meta.text}</p>
                      <label className="interval">
                        Every{" "}
                        <input
                          aria-label={`${meta.title} interval in minutes`}
                          type="number"
                          min="1"
                          max="240"
                          value={r.minutes}
                          onChange={(e) =>
                            reminder(k, {
                              minutes: Math.max(
                                1,
                                Math.min(240, Number(e.target.value) || 1),
                              ),
                            })
                          }
                        />{" "}
                        min <span>↗</span>
                      </label>
                      {tab === "reminders" && (
                        <div className="message-editor">
                          <label htmlFor={`${k}-message`}>Miso’s message</label>
                          <textarea
                            id={`${k}-message`}
                            value={r.message}
                            maxLength={120}
                            onChange={(e) =>
                              reminder(k, { message: e.target.value })
                            }
                          />
                          <button
                            className="text-button"
                            onClick={() => void testReminder(k)}
                          >
                            <Play size={12} /> Preview reminder
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
              {tab === "reminders" && (
                <div className="info-strip">
                  <Info size={16} />
                  <p>
                    Reminders run while Miso is open, even during a nap. After
                    your computer sleeps, missed reminders combine into one
                    gentle nudge. Timers start fresh when you reopen Miso.
                  </p>
                </div>
              )}
            </section>
          )}
          {tab === "companion" && (
            <section className="quick-settings">
              <button onClick={() => setTab("appearance")}>
                <span className="quick-icon">
                  <Palette size={19} />
                </span>
                <span>
                  <b>A look of their own</b>
                  <small>Coat, name, and a little personality</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button onClick={() => setTab("desktop")}>
                <span className="quick-icon">
                  <Monitor size={19} />
                </span>
                <span>
                  <b>Right where you work</b>
                  <small>
                    {native
                      ? (currentDisplay?.name ?? "Detecting your displays…")
                      : "Desktop preferences & startup"}
                  </small>
                </span>
                <ChevronRight size={17} />
              </button>
            </section>
          )}
          {tab === "appearance" && (
            <section className="settings-panel">
              <div className="section-heading">
                <div>
                  <h2>The little details</h2>
                  <p>
                    Preview your changes above, then save when it feels right.
                  </p>
                </div>
                <Palette size={18} />
              </div>
              <div className="setting-row">
                <label htmlFor="pet-name">
                  <b>A name to come home to</b>
                  <small>What should we call your companion?</small>
                </label>
                <input
                  className="text-input"
                  id="pet-name"
                  maxLength={24}
                  value={settings.name}
                  onChange={(e) => change("name", e.target.value)}
                />
              </div>
              <div className="setting-row">
                <div>
                  <b>Coat color</b>
                  <small>Three equally good little cats.</small>
                </div>
                <div className="coat-options">
                  {(["ginger", "cream", "slate"] as Coat[]).map((coat) => (
                    <button
                      key={coat}
                      aria-label={`${coat} coat`}
                      aria-pressed={settings.coat === coat}
                      className={`coat ${coat} ${settings.coat === coat ? "chosen" : ""}`}
                      onClick={() => change("coat", coat)}
                    >
                      {settings.coat === coat && <Check size={15} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <b>Just the right size</b>
                  <small>Scales naturally with your screen.</small>
                </div>
                <div className="segmented">
                  {[
                    [96, "Small"],
                    [128, "Medium"],
                    [160, "Large"],
                  ].map(([size, label]) => (
                    <button
                      key={size}
                      aria-pressed={settings.size === size}
                      className={settings.size === size ? "active" : ""}
                      onClick={() => change("size", Number(size))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="setting-row">
                <label htmlFor="speed">
                  <b>A comfortable pace</b>
                  <small>{settings.speed} pixels per second</small>
                </label>
                <div className="range-wrap">
                  <span>Stroll</span>
                  <input
                    id="speed"
                    type="range"
                    min="10"
                    max="100"
                    value={settings.speed}
                    onChange={(e) => change("speed", Number(e.target.value))}
                  />
                  <span>Scamper</span>
                </div>
              </div>
              <div className="animation-tests">
                <span>Try a little mood</span>
                {(
                  [
                    "idle",
                    "walking",
                    "sleeping",
                    "jumping",
                    "happy",
                  ] as Animation[]
                ).map((a) => (
                  <button
                    className={animation === a ? "active" : ""}
                    key={a}
                    onClick={() => void play(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </section>
          )}
          {tab === "desktop" && (
            <section className="settings-panel">
              <div className="section-heading">
                <div>
                  <h2>A place on your desktop</h2>
                  <p>Always close by, with room for everything else.</p>
                </div>
                <Monitor size={20} />
              </div>
              <div className="setting-row">
                <label htmlFor="monitor">
                  <b>Home screen</b>
                  <small>
                    Stroll along the bottom of the available work area.
                  </small>
                </label>
                <select
                  id="monitor"
                  value={settings.monitor}
                  onChange={(e) => change("monitor", e.target.value)}
                >
                  <option value="primary">Follow primary display</option>
                  {displays.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                      {d.primary ? " · primary" : ""}
                    </option>
                  ))}
                  {settings.monitor !== "primary" &&
                    !displays.some((d) => d.id === settings.monitor) && (
                      <option value={settings.monitor}>
                        Disconnected display · using primary
                      </option>
                    )}
                </select>
              </div>
              {currentDisplay && (
                <div className="display-detail">
                  <Monitor size={36} strokeWidth={1.2} />
                  <div>
                    <b>{currentDisplay.name}</b>
                    <p>
                      {currentDisplay.bounds.right - currentDisplay.bounds.left}{" "}
                      ×{" "}
                      {currentDisplay.bounds.bottom - currentDisplay.bounds.top}{" "}
                      · {Math.round(currentDisplay.scale * 100)}% scaling ·
                      Taskbar: {currentDisplay.taskbar}
                      {currentDisplay.autoHide ? " (auto-hide)" : ""}
                    </p>
                    <small>
                      Display changes are detected automatically. An unplugged
                      screen falls back to your primary display.
                    </small>
                  </div>
                </div>
              )}
              <div className="setting-row">
                <div>
                  <b>A little room to roam</b>
                  <small>
                    Walk, pause, and turn around at the screen’s edge.
                  </small>
                </div>
                <Toggle
                  label="Roam along the taskbar"
                  checked={settings.roaming}
                  onChange={(v) => change("roaming", v)}
                />
              </div>
              <div className="setting-row">
                <div>
                  <b>Something to say</b>
                  <small>Show speech bubbles and reminder messages.</small>
                </div>
                <Toggle
                  label="Show speech bubbles"
                  checked={settings.bubbles}
                  onChange={(v) => change("bubbles", v)}
                />
              </div>
              <div className="setting-row">
                <div>
                  <b>Meet me at sign-in</b>
                  <small>
                    {native
                      ? "Automatically start Miso when you sign in to Windows."
                      : "Available in the installed Windows app."}
                  </small>
                </div>
                <Toggle
                  disabled={!native}
                  label="Start with Windows"
                  checked={settings.autostart}
                  onChange={(v) => change("autostart", v)}
                />
              </div>
              <div className="info-strip">
                <MousePointer2 size={18} />
                <p>
                  Click for a head scratch. Double-click for a jump. Right-click
                  to open settings. Only the character catches clicks; bubbles
                  and empty space let you work normally.
                </p>
              </div>
            </section>
          )}
          {tab === "about" && (
            <section className="about-card">
              <span className="about-pet">
                <PetSprite animation="happy" coat={settings.coat} />
              </span>
              <h2>Good company. No strings attached.</h2>
              <p>
                Miso is a small, open-source Windows companion built with Tauri,
                React, and an original pixel-art cat. No account, subscription,
                backend, or paid assets.
              </p>
              <div className="about-features">
                <span>
                  <ShieldCheck />
                  Private & local
                </span>
                <span>
                  <Leaf />
                  Works offline
                </span>
                <span>
                  <Heart />
                  MIT licensed
                </span>
              </div>
              <div className="about-help">
                <h3>A few things to know</h3>
                <p>
                  Closing settings keeps Miso with you. Use the system tray to
                  hide the pet, snooze reminders, or quit. Windows startup is
                  optional in Desktop & startup.
                </p>
                <p>
                  The pet stays over ordinary desktop apps. Windows secure
                  screens and exclusive fullscreen apps can cover it. For top or
                  side taskbars, Miso walks along the bottom of the usable
                  desktop.
                </p>
                <p>
                  Build and installation instructions are included in README.md.
                  The installer includes the free Microsoft WebView2 runtime.
                  After installation, no editor or developer tools are needed.
                </p>
              </div>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <Heart size={13} /> A small friend for the everyday.
            </span>
            <span>Made for your quiet corner of the world.</span>
          </footer>
        </div>
        <div className={`save-bar ${dirty ? "has-changes" : ""}`}>
          <span>
            {dirty ? (
              <>
                <span className="unsaved-dot" /> A few little changes to keep.
              </>
            ) : (
              <>
                <Check size={15} /> All settled. Make yourself at home.
              </>
            )}
          </span>
          <div>
            {dirty && (
              <button
                className="discard-button"
                disabled={busy}
                onClick={() => setSettings(structuredClone(saved))}
              >
                Discard
              </button>
            )}
            <button
              className="save-button"
              disabled={
                !ready ||
                busy ||
                !settings.name.trim() ||
                reminderKinds.some(
                  (k) => !settings.reminders[k].message.trim(),
                ) ||
                !dirty
              }
              onClick={() => void save()}
            >
              {busy ? (
                "Saving…"
              ) : (
                <>
                  <Check size={15} />
                  Save changes
                </>
              )}
            </button>
          </div>
        </div>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
