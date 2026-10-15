import { describe, it, expect } from "vitest";
import { defaults, normalizeSettings } from "./settings";
describe("settings resilience", () => {
  it("loads defaults for missing or corrupted structure", () => {
    for (const value of [null, [], 3, "bad"])
      expect(normalizeSettings(value)).toEqual(defaults);
  });
  it("clamps malformed values and keeps valid settings", () => {
    const s = normalizeSettings({
      name: " Bean ",
      coat: "slate",
      size: 100000,
      speed: Infinity,
      autostart: "yes",
      reminders: { water: { minutes: 9999, message: "   ", enabled: false } },
    });
    expect(s.name).toBe("Bean");
    expect(s.coat).toBe("slate");
    expect(s.size).toBe(80);
    expect(s.speed).toBe(45);
    expect(s.autostart).toBe(false);
    expect(s.reminders.water.minutes).toBe(240);
    expect(s.reminders.water.enabled).toBe(false);
    expect(s.reminders.water.message).toBe(defaults.reminders.water.message);
  });
  it("roundtrips valid settings without changing user choices", () => {
    const s = structuredClone(defaults);
    s.name = "Pixel";
    s.character = "fox";
    s.walkStart = 20;
    s.walkEnd = 70;
    s.homeSide = "right";
    s.alertsOnly = true;
    s.reminders.break.minutes = 22;
    s.bubbles = false;
    expect(normalizeSettings(JSON.parse(JSON.stringify(s)))).toEqual(s);
  });
});

it("migrates old preferences and normalizes unknown characters and crossed limits", () => {
  const old = { name: "My Miso", coat: "cream", roaming: false };
  const s = normalizeSettings(old);
  expect(s.character).toBe("alex");
  expect(s.name).toBe(old.name);
  expect(s.roaming).toBe(false);
  expect(s.walkStart).toBe(0);
  expect(s.walkEnd).toBe(100);
  const invalid = normalizeSettings({
    character: "../../evil",
    homeSide: "top",
    walkStart: 95,
    walkEnd: 5,
  });
  expect(invalid.character).toBe("alex");
  expect(invalid.homeSide).toBe("left");
  expect(invalid.walkStart).toBe(90);
  expect(invalid.walkEnd).toBe(100);
});
