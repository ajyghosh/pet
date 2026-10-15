import options from "./creator-options.json" with { type: "json" };
export { options as creatorOptions };
export const MAX_CUSTOM_CHARACTERS = 50;
export interface Appearance {
  base: string;
  skinTone: string;
  faceShape: string;
  eyeStyle: string;
  browStyle: string;
  facialHair: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  shoes: string;
  accessories: string[];
}
export interface CustomCharacter {
  schemaVersion: 1;
  id: string;
  name: string;
  style: "cute-3d";
  source: "manual";
  appearance: Appearance;
  animations: Record<string, never>;
  personality: string;
  license: string;
}
export const defaultAppearance: Appearance = {
  base: "adult-neutral-01",
  skinTone: "medium",
  faceShape: "round",
  eyeStyle: "round",
  browStyle: "soft",
  facialHair: "none",
  hairStyle: "short-wavy",
  hairColor: "dark-brown",
  outfit: "blue-shirt-jeans",
  outfitColor: "#6386db",
  shoes: "white-sneakers",
  accessories: [],
};
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid character record.");
  return value as Record<string, unknown>;
};
function onlyKeys(record: Record<string, unknown>, keys: string[]) {
  if (Object.keys(record).some((key) => !keys.includes(key)))
    throw Error("Unsupported character field.");
}
/** JSON sent to Rust cannot contain unpaired UTF-16 surrogates. */
export function assertUnicodeText(value: unknown): void {
  if (typeof value === "string") {
    for (const character of value) {
      const point = character.codePointAt(0)!;
      if (point >= 0xd800 && point <= 0xdfff)
        throw Error(
          "Text contains an incomplete Unicode character. Please re-enter it.",
        );
    }
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) assertUnicodeText(item);
  }
}
function text(value: unknown, max: number, optional = false) {
  if (optional && value === undefined) return "";
  if (
    typeof value !== "string" ||
    (!optional && !value.trim()) ||
    [...value].length > max
  )
    throw Error(`Text must be ${optional ? "0" : "1"}–${max} characters.`);
  assertUnicodeText(value);
  return value.trim();
}
/** Phase 1 presets contain appearance data only; no asset paths or executable content. */
export function validateCustomCharacter(value: unknown): CustomCharacter {
  const v = object(value);
  onlyKeys(v, [
    "schemaVersion",
    "id",
    "name",
    "style",
    "source",
    "appearance",
    "animations",
    "personality",
    "license",
  ]);
  if (
    v.schemaVersion !== 1 ||
    v.style !== "cute-3d" ||
    v.source !== "manual" ||
    typeof v.id !== "string" ||
    !/^custom-[a-zA-Z0-9_-]{1,57}$/.test(v.id)
  )
    throw Error("Unsupported character ID, version, style, or source.");
  const raw = object(v.appearance);
  onlyKeys(raw, Object.keys(defaultAppearance));
  for (const key of ["base", "skinTone", "hairStyle", "hairColor", "outfit"])
    if (!(key in raw)) throw Error(`Missing appearance field: ${key}`);
  const appearance = {
    ...structuredClone(defaultAppearance),
    ...raw,
  } as Appearance;
  for (const [key, choices] of Object.entries(options)) {
    if (key === "accessories") continue;
    if (!choices.includes(appearance[key as keyof Appearance] as string))
      throw Error(`Unsupported ${key}.`);
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(appearance.outfitColor))
    throw Error("Choose a valid clothing color.");
  if (
    !Array.isArray(appearance.accessories) ||
    appearance.accessories.length > 4 ||
    new Set(appearance.accessories).size !== appearance.accessories.length ||
    appearance.accessories.some((a) => !options.accessories.includes(a))
  )
    throw Error("Unsupported or repeated accessory.");
  const animations = object(v.animations);
  if (Object.keys(animations).length)
    throw Error(
      "External animation assets are not supported by manual presets.",
    );
  return {
    schemaVersion: 1,
    id: v.id,
    name: text(v.name, 80),
    style: "cute-3d",
    source: "manual",
    appearance,
    animations: {},
    personality: text(v.personality, 100, true),
    license: text(v.license === undefined ? "user-created" : v.license, 100),
  };
}
export function validateCustomCharacters(value: unknown): CustomCharacter[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > MAX_CUSTOM_CHARACTERS)
    throw Error("You can save up to 50 custom characters.");
  const list = value.map(validateCustomCharacter);
  if (new Set(list.map((c) => c.id)).size !== list.length)
    throw Error("Duplicate custom character IDs.");
  return list;
}
export function newCustomCharacter(): CustomCharacter {
  return {
    schemaVersion: 1,
    id: `custom-${crypto.randomUUID()}`,
    name: "My Companion",
    style: "cute-3d",
    source: "manual",
    appearance: structuredClone(defaultAppearance),
    animations: {},
    personality: "A friendly face for your day",
    license: "user-created",
  };
}
const customRegistry = new Map<string, CustomCharacter>();
export function registerCustomCharacters(records: CustomCharacter[]) {
  const valid = validateCustomCharacters(records);
  customRegistry.clear();
  for (const c of valid) customRegistry.set(c.id, c);
}
export function getCustomCharacter(id: string) {
  return customRegistry.get(id);
}

export function duplicateCustomCharacter(
  character: CustomCharacter,
): CustomCharacter {
  return validateCustomCharacter({
    ...structuredClone(character),
    id: newCustomCharacter().id,
    name: `${[...character.name].slice(0, 75).join("")} copy`,
  });
}
