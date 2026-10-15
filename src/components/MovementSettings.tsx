import { useEffect, useState } from "react";
import { advance, createPet, remind } from "../core/engine";
import type { Settings } from "../core/settings";
import { PetSprite } from "./PetSprite";
export function MovementSettings({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}) {
  const [pet, setPet] = useState(createPet);
  const [frame, setFrame] = useState(0);
  // A scaled, independent simulation: it never sends commands to the desktop.
  const simulation = { ...settings, size: 64 };
  useEffect(() => {
    setPet(advance(createPet(), 0, 0, 1000, { ...settings, size: 64 }));
    let now = 0;
    const timer = setInterval(() => {
      now += 50;
      setPet((p) => advance(p, now, 0.05, 1000, { ...settings, size: 64 }));
      setFrame(Math.floor(now / 160));
    }, 50);
    return () => clearInterval(timer);
  }, [
    settings.roaming,
    settings.alertsOnly,
    settings.homeSide,
    settings.walkStart,
    settings.walkEnd,
    settings.speed,
  ]);
  const mode = !settings.roaming
    ? "park"
    : settings.alertsOnly
      ? "alerts"
      : "free";
  return (
    <div className="movement-settings">
      <div className="setting-row">
        <label htmlFor="movement-mode">
          <b>When to walk</b>
          <small>Keep company quietly, or take a little stroll.</small>
        </label>
        <select
          id="movement-mode"
          value={mode}
          onChange={(e) =>
            onChange({
              roaming: e.target.value !== "park",
              alertsOnly: e.target.value === "alerts",
            })
          }
        >
          <option value="free">Walk freely</option>
          <option value="park">Stay in place</option>
          <option value="alerts">Only move for reminders</option>
        </select>
      </div>
      <div className="setting-row">
        <div>
          <b>Home side</b>
          <small>Rest at this side of your chosen walking area.</small>
        </div>
        <div className="segmented" aria-label="Home side">
          {(["left", "right"] as const).map((side) => (
            <button
              key={side}
              aria-label={`Park on the ${side}`}
              aria-pressed={settings.homeSide === side}
              onClick={() => onChange({ homeSide: side })}
            >
              {side === "left" ? "← Left" : "Right →"}
            </button>
          ))}
        </div>
      </div>
      <div className="walking-area">
        <h3>Choose the walking area</h3>
        <p>
          Set the left and right limits along your selected display. The whole
          companion stays inside this area when there is room.
        </p>
        <div
          className="walking-map"
          aria-label={`Walking area from ${settings.walkStart}% to ${settings.walkEnd}%`}
        >
          <div
            className="walking-map-range"
            style={{
              left: `${settings.walkStart}%`,
              width: `${settings.walkEnd - settings.walkStart}%`,
            }}
          />
          <div
            className="walking-map-pet"
            style={{ left: `${pet.x / 10}%`, width: "6.4%" }}
          >
            <PetSprite
              character={settings.character}
              coat={settings.coat}
              animation={pet.animation}
              frame={frame}
              direction={pet.direction}
            />
          </div>
          <span className="walking-map-label">SCALED AREA PREVIEW</span>
        </div>
        <div className="area-sliders">
          <label>
            Left limit <b>{settings.walkStart}%</b>
            <input
              aria-label="Walking area left limit"
              type="range"
              min="0"
              max="90"
              step="1"
              value={settings.walkStart}
              onChange={(e) => {
                const start = Number(e.target.value);
                onChange({
                  walkStart: start,
                  walkEnd: Math.max(settings.walkEnd, start + 10),
                });
              }}
            />
          </label>
          <label>
            Right limit <b>{settings.walkEnd}%</b>
            <input
              aria-label="Walking area right limit"
              type="range"
              min="10"
              max="100"
              step="1"
              value={settings.walkEnd}
              onChange={(e) => {
                const end = Number(e.target.value);
                onChange({
                  walkEnd: end,
                  walkStart: Math.min(settings.walkStart, end - 10),
                });
              }}
            />
          </label>
        </div>
        <div className="area-actions">
          <button
            className="secondary-button"
            onClick={() => onChange({ walkStart: 0, walkEnd: 100 })}
          >
            Use full width
          </button>
          <button
            className="secondary-button"
            onClick={() => setPet((p) => remind(p, frame * 160, simulation))}
          >
            Preview reminder movement
          </button>
        </div>
        <p className="field-help">
          {mode === "alerts"
            ? "Reminders bring a short walk and wave, then a return home (about 6 seconds)."
            : mode === "park"
              ? "Your companion stays at home and reacts to reminders in place."
              : "Your companion walks and takes little pauses between the two limits."}{" "}
          Save changes to apply to your desktop.
        </p>
      </div>
    </div>
  );
}
