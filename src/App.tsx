import { characters, characterInfo, type CharacterId } from "./core/characters";
import { CharacterGallery } from "./components/CharacterGallery";
import { MovementSettings } from "./components/MovementSettings";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Check,
  ChevronRight,
  Coffee,
  Droplets,
  Heart,
  Info,
  Monitor,
  Moon,
  MousePointer2,
  Palette,
  Play,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Users,
  VolumeX,
  X,
} from "lucide-react";
import {
  action,
  bootstrap,
  monitors,
  inputStatus,
  requestInputPermission,
  desktopStatus,
  restartPet,
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
import { CompanionPreview } from "./components/CompanionPreview";

type Tab =
  | "companion"
  | "characters"
  | "preview"
  | "reminders"
  | "appearance"
  | "desktop"
  | "about";
const reminderMeta = {
  water: {
    title: "Drink water",
    description: "A sip now. A happier you later.",
    icon: Droplets,
    color: "blue",
  },
  stretch: {
    title: "Stretch a little",
    description: "Unwind those desk-day shoulders.",
    icon: Sprout,
    color: "purple",
  },
  break: {
    title: "Take a break",
    description: "Step away. Find a fresh perspective.",
    icon: Coffee,
    color: "orange",
  },
};
const outfits: { id: Coat; label: string; hex: string }[] = [
  { id: "slate", label: "Electric blue", hex: "#5479ef" },
  { id: "cream", label: "Soft violet", hex: "#a184e8" },
  { id: "ginger", label: "Sunset coral", hex: "#ee795e" },
];
function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className={`toggle ${checked ? "on" : ""}`}
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
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
  const [platform, setPlatform] = useState("browser"),
    [clickEnabled, setClickEnabled] = useState(false);
  const [petStatus, setPetStatus] = useState(
    "Starting your desktop companion…",
  );
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [restarting, setRestarting] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [animation, setAnimation] = useState<Animation>("idle"),
    [frame, setFrame] = useState(0);
  const mac = platform === "macos";
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);
  useEffect(() => {
    let active = true;
    let off: (() => void) | undefined;
    void bootstrap()
      .then((data) => {
        if (active) {
          setSettings(data.settings);
          setSaved(data.settings);
          setPlatform(data.platform);
          setClickEnabled(data.clickEnabled);
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
      void inputStatus()
        .then((v) => {
          if (active) setClickEnabled(v);
        })
        .catch(() => {});
      void desktopStatus()
        .then((s) => {
          if (active) setPetStatus(s);
        })
        .catch((e) => {
          if (active)
            setPetStatus(`Could not check the companion: ${String(e)}`);
        });
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    void on<string>("native-error", setError).then((cleanup) => {
      if (active) off = cleanup;
      else cleanup();
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
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
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
          ? "Your changes are saved on this device."
          : "Saved in this browser.",
      );
    } catch (e) {
      setError(`Could not save: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function play(a: Animation | "snooze" | "wake") {
    if (a === "snooze") setNotice("Reminders snoozed for 15 minutes.");
    else setAnimation(a === "wake" ? "idle" : a);
    try {
      await action(a);
    } catch (e) {
      setError(String(e));
    }
  }
  async function testReminder(kind: ReminderKind) {
    if (native && dirty) {
      setNotice("Save changes first to test the updated reminder.");
      return;
    }
    setNotice(settings.reminders[kind].message);
    try {
      await action(`reminder:${kind}`);
    } catch (e) {
      setError(String(e));
    }
  }
  async function recover() {
    setRestarting(true);
    try {
      await restartPet();
      setPetStatus("Restarting your desktop companion…");
    } catch (e) {
      setError(`Could not restart: ${String(e)}`);
    } finally {
      setRestarting(false);
    }
  }
  function chooseCharacter(character: CharacterId) {
    setSettings((s) => ({
      ...s,
      character,
      name: characters.some((c) => c.name === s.name)
        ? characterInfo(character).name
        : s.name,
    }));
  }
  const currentDisplay =
    displays.find((d) => d.id === settings.monitor) ??
    displays.find((d) => d.primary);
  const headings = {
    characters: [
      "Find your kind of company.",
      "Tiny paws, friendly faces, and a little imagination. Who’s joining you today?",
    ],
    companion: [
      "Small company. Big day.",
      "A little personality for your desktop. A little more room for you.",
    ],
    preview: [
      "Meet your next desk buddy.",
      "Explore the animations, switch the scene, and see your style in motion.",
    ],
    reminders: [
      "Make room for a little you-time.",
      "Thoughtful nudges, on your schedule. Always easy to snooze.",
    ],
    appearance: [
      "A look that feels like you.",
      "A name, a color, and a pace that feels right.",
    ],
    desktop: [
      "Right at home on your desktop.",
      "Choose where your companion lives and when they join you.",
    ],
    about: [
      "Little companions. Real company.",
      "Made for your desktop. Built to stay yours.",
    ],
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => setTab("companion")}
          aria-label="MiniMates home"
        >
          <span className="brand-mark">
            <Users size={23} />
          </span>
          <span>
            mini<span>mates</span>
            <small>YOUR DESKTOP, ALIVE.</small>
          </span>
        </button>
        <div className="nav-caption">YOUR SPACE</div>
        <nav aria-label="Main navigation">
          {(
            [
              { id: "companion", label: "My companion", icon: Users },
              { id: "characters", label: "Characters", icon: Users },
              { id: "preview", label: "Preview studio", icon: Play },
              { id: "reminders", label: "Reminders", icon: Bell },
              { id: "appearance", label: "Appearance", icon: Palette },
              { id: "desktop", label: "Desktop & startup", icon: Monitor },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              className={`nav-item ${tab === item.id ? "selected" : ""}`}
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
              {tab === item.id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="note-spark">✳</span>
          <h3>
            A better kind of
            <br />
            screen time.
          </h3>
          <p>
            A wave. A water break.
            <br />
            The little things add up.
          </p>
          <span>A LITTLE FRIEND, ON YOUR SIDE.</span>
        </div>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${tab === "about" ? "selected" : ""}`}
            onClick={() => setTab("about")}
          >
            <Info size={18} />
            About MiniMates
          </button>
          <div className="local-badge">
            <ShieldCheck size={15} />
            <span>Offline. Private. All yours.</span>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>YOUR DAILY DOSE OF GOOD COMPANY</span>
          <span className={`connection ${native ? "" : "preview"}`}>
            <span />
            {native
              ? mac
                ? "Mac desktop"
                : "Windows desktop"
              : "Browser preview"}
          </span>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "companion"
                  ? "HELLO, HUMAN"
                  : tab === "preview"
                    ? "TRY A LITTLE MAGIC"
                    : "MAKE IT YOURS"}
              </div>
              <h1>{headings[tab][0]}</h1>
              <p>{headings[tab][1]}</p>
            </div>
            {tab === "companion" && (
              <button
                className="secondary-button"
                onClick={() => setTab("preview")}
              >
                <Play size={16} />
                Open preview
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {!native && (
            <div className="preview-note">
              <Monitor size={16} />
              <span>
                You’re exploring the browser preview. Install MiniMates for
                companions on your actual desktop.
              </span>
            </div>
          )}
          {native && (
            <div className="desktop-status">
              <div>
                <span className="status-orb" />
                <div>
                  <b>Desktop companion</b>
                  <small role="status">{petStatus}</small>
                </div>
              </div>
              <button
                className="text-button"
                disabled={restarting}
                onClick={() => void recover()}
              >
                <RotateCcw size={14} />
                {restarting ? "Restarting…" : "Show / restart pet"}
              </button>
            </div>
          )}
          {tab === "companion" && (
            <>
              <div className="hero-grid">
                <CompanionPreview settings={settings} />
                <section className="profile-card">
                  <div className="card-eyebrow">
                    <span>YOUR COMPANION</span>
                    <span className="count-tag">01</span>
                  </div>
                  <div className={`profile-avatar ${settings.coat}`}>
                    <div className="avatar-orbit" />
                    <PetSprite
                      animation={animation}
                      frame={frame}
                      coat={settings.coat}
                      character={settings.character}
                    />
                    <span className="avatar-spark">✦</span>
                  </div>
                  <h2>{settings.name}</h2>
                  <p>
                    {animation === "sleeping"
                      ? "Off on a tiny dream adventure."
                      : "Creative spirit. Excellent desk company."}
                  </p>
                  <span className="personality-tag">
                    <Sparkles size={12} />
                    {characterInfo(settings.character).description}
                  </span>
                  <div className="quick-actions">
                    <button onClick={() => void play("happy")}>
                      <Heart size={17} />
                      Say hello
                    </button>
                    <button onClick={() => void play("jumping")}>
                      <Sparkles size={17} />
                      Let’s play
                    </button>
                    <button
                      onClick={() =>
                        void play(
                          animation === "sleeping" ? "wake" : "sleeping",
                        )
                      }
                    >
                      {animation === "sleeping" ? (
                        <Sun size={17} />
                      ) : (
                        <Moon size={17} />
                      )}{" "}
                      {animation === "sleeping" ? "Wake up" : "Nap time"}
                    </button>
                  </div>
                  <button
                    className="profile-edit"
                    onClick={() => setTab("characters")}
                  >
                    Choose character <ChevronRight size={15} />
                  </button>
                  <button
                    className="profile-edit"
                    onClick={() => setTab("appearance")}
                  >
                    Personalize companion
                    <ChevronRight size={15} />
                  </button>
                </section>
              </div>
              <div className="section-heading">
                <div>
                  <h2>Little reminders, better rhythms.</h2>
                  <p>Take care of the human behind the screen.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab("reminders")}
                >
                  Manage reminders
                  <ArrowUpRight size={15} />
                </button>
              </div>
              <div className="reminder-grid">
                {reminderKinds.map((k) => {
                  const m = reminderMeta[k],
                    r = settings.reminders[k];
                  return (
                    <button
                      key={k}
                      className={`reminder-summary ${m.color}`}
                      onClick={() => setTab("reminders")}
                    >
                      <span className="reminder-icon">
                        <m.icon size={21} />
                      </span>
                      <b>{m.title}</b>
                      <span>
                        {r.enabled ? `Every ${r.minutes} minutes` : "Paused"}
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  );
                })}
              </div>
              <div className="bottom-note">
                <MousePointer2 size={17} />
                <span>
                  A click says hello. A double-click brings a little joy.
                  Transparent space stays out of your way.
                </span>
              </div>
            </>
          )}
          {tab === "preview" && (
            <>
              <CompanionPreview settings={settings} expanded />
              <div className="preview-options">
                <div>
                  <h2>Your own tiny stage.</h2>
                  <p>
                    Pause, switch day and night, or click your companion to
                    wave. Preview never changes the live desktop animation.
                  </p>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => setTab("appearance")}
                >
                  <Palette size={16} />
                  Change the look
                </button>
              </div>
            </>
          )}
          {tab === "reminders" && (
            <>
              <div className="reminder-toolbar">
                <div>
                  <Bell size={18} />
                  <span>
                    {
                      reminderKinds.filter((k) => settings.reminders[k].enabled)
                        .length
                    }{" "}
                    reminders enabled
                  </span>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => void play("snooze")}
                >
                  <Moon size={15} />
                  Snooze 15 minutes
                </button>
              </div>
              <div className="reminder-list">
                {reminderKinds.map((k) => {
                  const m = reminderMeta[k],
                    r = settings.reminders[k];
                  return (
                    <section key={k} className={`reminder-card ${m.color}`}>
                      <div className="reminder-card-heading">
                        <span className="reminder-icon">
                          <m.icon size={23} />
                        </span>
                        <div>
                          <h2>{m.title}</h2>
                          <p>{m.description}</p>
                        </div>
                        <Toggle
                          label={`${m.title} reminder`}
                          checked={r.enabled}
                          onChange={(enabled) => reminder(k, { enabled })}
                        />
                      </div>
                      <div className="reminder-fields">
                        <label>
                          Remind me every
                          <div className="interval-input">
                            <input
                              aria-label={`${m.title} interval in minutes`}
                              type="number"
                              min={1}
                              max={240}
                              value={r.minutes}
                              onChange={(e) =>
                                reminder(k, {
                                  minutes: Math.max(
                                    1,
                                    Math.min(240, Number(e.target.value) || 1),
                                  ),
                                })
                              }
                            />
                            <span>minutes</span>
                          </div>
                        </label>
                        <label>
                          A little message
                          <input
                            aria-label={`${m.title} message`}
                            maxLength={120}
                            value={r.message}
                            onChange={(e) =>
                              reminder(k, { message: e.target.value })
                            }
                          />
                        </label>
                        <button
                          className="text-button"
                          onClick={() => void testReminder(k)}
                        >
                          <Play size={14} />
                          Try it
                        </button>
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="bottom-note">
                <VolumeX size={17} />
                <span>
                  Gentle visual reminders. No alarms, no guilt. Turning off
                  speech bubbles also silences reminders.
                </span>
              </div>
            </>
          )}
          {tab === "characters" && (
            <CharacterGallery
              settings={settings}
              frame={frame}
              onSelect={chooseCharacter}
            />
          )}
          {tab === "appearance" && (
            <div className="appearance-grid">
              <section className="settings-card">
                <div className="section-heading">
                  <div>
                    <h2>Meet your one-of-a-kind.</h2>
                    <p>A name, a color, a little personality.</p>
                  </div>
                  <Palette size={21} />
                </div>
                <label className="field-label" htmlFor="pet-name">
                  Your companion’s name
                </label>
                <input
                  id="pet-name"
                  maxLength={24}
                  value={settings.name}
                  onChange={(e) => change("name", e.target.value)}
                />
                <div className="field-label">Choose an outfit</div>
                <div className="outfit-options">
                  {outfits.map((o) => (
                    <button
                      key={o.id}
                      aria-label={`${o.label} outfit`}
                      aria-pressed={settings.coat === o.id}
                      onClick={() => change("coat", o.id)}
                    >
                      <span style={{ background: o.hex }}>
                        {settings.coat === o.id && <Check size={16} />}
                      </span>
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="field-label">
                  A little bigger. A little smaller.
                </div>
                <div className="segmented">
                  {[64, 80, 96, 128, 160].map((s) => (
                    <button
                      key={s}
                      aria-pressed={settings.size === s}
                      onClick={() => change("size", s)}
                    >
                      {s}
                      <small>px</small>
                    </button>
                  ))}
                </div>
                <label className="range-label" htmlFor="speed">
                  <span>Walking pace</span>
                  <b>{settings.speed} px/s</b>
                </label>
                <input
                  id="speed"
                  type="range"
                  min={10}
                  max={100}
                  value={settings.speed}
                  onChange={(e) => change("speed", Number(e.target.value))}
                />
                <div className="range-captions">
                  <span>Easy stroll</span>
                  <span>Places to be</span>
                </div>
                <p className="field-help">
                  Changes appear in preview immediately. Save to update your
                  desktop companion.
                </p>
              </section>
              <CompanionPreview settings={settings} />
            </div>
          )}
          {tab === "desktop" && (
            <section className="settings-card">
              <div className="section-heading">
                <div>
                  <h2>A place to call home.</h2>
                  <p>We’ll leave the rest of your desktop to you.</p>
                </div>
                <Monitor size={22} />
              </div>
              <div className="setting-row">
                <label htmlFor="monitor">
                  <b>Home screen</b>
                  <small>
                    Your companion follows the bottom edge of the usable
                    desktop.
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
                  <Monitor size={28} />
                  <div>
                    <b>{currentDisplay.name}</b>
                    <small>
                      {currentDisplay.bounds.right - currentDisplay.bounds.left}{" "}
                      ×{" "}
                      {currentDisplay.bounds.bottom - currentDisplay.bounds.top}{" "}
                      {mac ? "points" : "pixels"} ·{" "}
                      {Math.round(currentDisplay.scale * 100)}% scale ·{" "}
                      {mac ? "Dock" : "Taskbar"}: {currentDisplay.taskbar}
                      {currentDisplay.autoHide ? " (auto-hide)" : ""}
                    </small>
                  </div>
                </div>
              )}
              <MovementSettings
                settings={settings}
                onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
              />
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
                      ? "Start quietly when you log in. Saved for your user account."
                      : "Available in the installed desktop app."}
                  </small>
                </div>
                <Toggle
                  disabled={!native}
                  label={mac ? "Start at login" : "Start with Windows"}
                  checked={settings.autostart}
                  onChange={(v) => change("autostart", v)}
                />
              </div>
              {mac && (
                <div className="setting-row">
                  <div>
                    <b>
                      {clickEnabled
                        ? "Companion clicks are enabled"
                        : "Enable companion clicks (optional)"}
                    </b>
                    <small>
                      Allow MiniMates in System Settings → Privacy &amp;
                      Security → Accessibility. Restart if needed. Walking,
                      reminders and menu-bar controls work without permission.
                    </small>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={clickEnabled}
                    onClick={() => {
                      void requestInputPermission()
                        .then(() =>
                          setNotice(
                            "Allow MiniMates in macOS Accessibility settings, then return here.",
                          ),
                        )
                        .catch((e) => setError(String(e)));
                    }}
                  >
                    {clickEnabled ? "Enabled" : "Enable clicks"}
                  </button>
                </div>
              )}
              <div className="bottom-note">
                <ShieldCheck size={18} />
                <span>
                  Windows installs and startup use your account. No system
                  service or administrator launch is needed. Company device
                  policies may still apply.
                </span>
              </div>
            </section>
          )}
          {tab === "about" && (
            <section className="about-card">
              <span className="about-icon">
                <Users size={35} />
              </span>
              <div className="eyebrow">MEET MINIMATES</div>
              <h2>A little more company.</h2>
              <p>
                Original animals and characters, friendly reminders, and a
                desktop that feels like yours. Built with Tauri, React, and
                Rust. Free to use, open source, and completely offline.
              </p>
              <div className="about-badges">
                <span>
                  <ShieldCheck />
                  Private by design
                </span>
                <span>
                  <Heart />
                  MIT licensed
                </span>
                <span>
                  <Monitor />
                  Windows + Mac
                </span>
              </div>
              <div className="phase-note">
                <b>132 companions · One little friend at a time</b>
                <p>
                  Choose from 132 original characters, each with three color
                  styles and six animation states. Pick a walking area, park on
                  either side, or move only for reminders. Multiple simultaneous
                  companions, creator, ZIP pack imports, and fullscreen
                  auto-hide are planned phases and are not available yet.
                </p>
              </div>
              <p className="field-help">
                Close this window to keep your companion with you. Use the tray
                or Mac menu bar to reopen settings or quit. No editor, terminal,
                or account is needed after installation.
              </p>
            </section>
          )}
          <footer className="page-footer">
            <span>
              <Heart size={12} />A little company goes a long way.
            </span>
            <span>MiniMates · 1.2</span>
          </footer>
        </div>
        <div className={`save-bar ${dirty ? "has-changes" : ""}`}>
          <span>
            {dirty ? (
              <>
                <span className="unsaved-dot" />
                Looking good. Keep these changes?
              </>
            ) : (
              <>
                <Check size={15} />
                All saved. Make yourself at home.
              </>
            )}
          </span>
          <div>
            {dirty && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() => setSettings(structuredClone(saved))}
              >
                Discard
              </button>
            )}
            <button
              className="primary-button"
              disabled={
                !ready ||
                busy ||
                !dirty ||
                !settings.name.trim() ||
                reminderKinds.some((k) => !settings.reminders[k].message.trim())
              }
              onClick={() => void save()}
            >
              {busy ? (
                "Saving…"
              ) : (
                <>
                  <Check size={16} />
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
          <span>{notice}</span>
          <button
            className="icon-button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
