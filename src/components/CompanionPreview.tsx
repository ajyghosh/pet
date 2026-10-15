import { useReducedMotion } from "../hooks/useReducedMotion";
import { useEffect, useRef, useState } from "react";
import { Moon, Sun, Pause, Play, Monitor } from "lucide-react";
import { PetSprite } from "./PetSprite";
import type { Animation, Settings } from "../core/settings";

export const animations: { id: Animation; label: string }[] = [
  { id: "idle", label: "Idle" },
  { id: "walking", label: "Walk" },
  { id: "happy", label: "Wave" },
  { id: "jumping", label: "Jump" },
  { id: "drinking", label: "Drink water" },
  { id: "sleeping", label: "Sleep" },
];
export function CompanionPreview({
  settings,
  expanded = false,
}: {
  settings: Settings;
  expanded?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [animation, setAnimation] = useState<Animation>("walking");
  const [paused, setPaused] = useState(reducedMotion);
  useEffect(() => {
    if (reducedMotion) setPaused(true);
  }, [reducedMotion]);
  const [night, setNight] = useState(false);
  const [time, setTime] = useState(0);
  const stage = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (paused) return;
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      setTime((t) => t + Math.min(now - previous, 100));
      previous = now;
    }, 50);
    return () => clearInterval(timer);
  }, [paused]);
  const size = Math.min(settings.size * (expanded ? 1.5 : 1.35), 160);
  const distance = Math.max(1, width - size - 48);
  const progress = ((time / 1000) * settings.speed) % (distance * 2);
  const direction = progress <= distance ? 1 : -1;
  const x =
    animation === "walking"
      ? 24 + (progress <= distance ? progress : distance * 2 - progress)
      : (width - size) / 2;
  const speechWidth = Math.min(220, Math.max(1, width - 32));
  const lift =
    animation === "jumping"
      ? Math.max(0, Math.sin(((time % 1400) / 700) * Math.PI)) * 55
      : 0;
  return (
    <section
      className={`preview-card ${expanded ? "expanded" : ""}`}
      aria-label="Interactive companion preview"
    >
      <div className="preview-top">
        <span>
          <span className="live-dot" /> LIVE PREVIEW
        </span>
        <div>
          <button
            className="icon-button"
            aria-label={paused ? "Play preview" : "Pause preview"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? <Play size={16} /> : <Pause size={16} />}
          </button>
          <button
            className="icon-button"
            aria-label={night ? "Day preview" : "Night preview"}
            onClick={() => setNight(!night)}
          >
            {night ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </div>
      <div ref={stage} className={`preview-stage ${night ? "night" : ""}`}>
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="mini-window">
          <div>
            <i />
            <i />
            <i />
          </div>
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="stage-copy">
          <span>BETTER DAYS,</span>
          <strong>little by little.</strong>
          <p>Your own corner of good company.</p>
        </div>
        <div
          className="preview-human"
          data-animation={animation}
          style={{ width: size, height: size, left: x, bottom: 45 + lift }}
        >
          {(animation === "happy" ||
            animation === "drinking" ||
            animation === "sleeping") && (
            <div
              className="preview-speech"
              style={{
                width: speechWidth,
                left: Math.max(
                  16 - x,
                  Math.min(
                    (size - speechWidth) / 2,
                    width - 16 - x - speechWidth,
                  ),
                ),
              }}
            >
              {animation === "drinking"
                ? "Water break? 💧"
                : animation === "sleeping"
                  ? "A little recharge. z z z"
                  : `Hey, I'm ${settings.name}!`}
            </div>
          )}
          <button
            className="preview-pet-trigger"
            aria-label={`${animation === "sleeping" ? "Wake" : "Greet"} ${settings.name} in preview`}
            onClick={() => {
              setAnimation("happy");
              setTime(0);
            }}
          >
            <PetSprite
              animation={animation}
              frame={Math.floor(time / 160)}
              coat={settings.coat}
              character={settings.character}
              direction={animation === "walking" ? direction : 1}
            />
          </button>
        </div>
        <div className="preview-taskbar" aria-hidden="true">
          <span className="taskbar-start">▦</span>
          <span className="taskbar-search">
            ⌕ <small>Search</small>
          </span>
          <i />
          <i />
          <i />
          <div className="taskbar-clock">
            09:41<small>A good day ahead</small>
          </div>
        </div>
      </div>
      <div className="preview-controls" aria-label="Preview animations">
        {animations.map((a) => (
          <button
            key={a.id}
            aria-pressed={animation === a.id}
            onClick={() => {
              setAnimation(a.id);
              setTime(0);
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <p className="preview-caption">
        <Monitor size={13} /> Preview only. Try every animation without changing
        your desktop.
      </p>
    </section>
  );
}
