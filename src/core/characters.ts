import { getCustomCharacter } from "./customCharacters.ts";
import readyIds from "./ready-characters.json" with { type: "json" };
import seed from "../../assets/characters/collections/characters.json" with { type: "json" };
/** Original bundled characters. IDs are persisted in both browser and native settings. */
const originals = [
  {
    id: "alex",
    name: "Alex",
    kind: "People",
    description: "Your everyday optimist",
    color: "#e4eaff",
  },
  {
    id: "nova",
    name: "Nova",
    kind: "People",
    description: "Big dreams, bright sneakers",
    color: "#fbe0ef",
  },
  {
    id: "sage",
    name: "Sage",
    kind: "Fantasy",
    description: "A little everyday magic",
    color: "#ebe0ff",
  },
  {
    id: "cat",
    name: "Mochi",
    kind: "Animals",
    description: "Cat · tiny paws, big opinions",
    color: "#ffead5",
  },
  {
    id: "corgi",
    name: "Biscuit",
    kind: "Animals",
    description: "Corgi · your loyal little shadow",
    color: "#ffe3cb",
  },
  {
    id: "fox",
    name: "Ember",
    kind: "Animals",
    description: "Fox · curious by nature",
    color: "#ffded8",
  },
  {
    id: "rabbit",
    name: "Clover",
    kind: "Animals",
    description: "Rabbit · a soft spot for you",
    color: "#f6e3fa",
  },
  {
    id: "panda",
    name: "Bao",
    kind: "Animals",
    description: "Panda · professional nap taker",
    color: "#e7e7fb",
  },
  {
    id: "penguin",
    name: "Pip",
    kind: "Animals",
    description: "Penguin · a very happy waddle",
    color: "#dcefff",
  },
  {
    id: "frog",
    name: "Sprout",
    kind: "Animals",
    description: "Frog · one hop at a time",
    color: "#dff3d9",
  },
  {
    id: "robot",
    name: "Bolt",
    kind: "Fantasy",
    description: "Robot · powered by good company",
    color: "#d9f2f8",
  },
  {
    id: "dragon",
    name: "Cinder",
    kind: "Fantasy",
    description: "Dragon · small wings, warm heart",
    color: "#f0dfff",
  },
] as const;
export type CharacterId = string;
export interface Character {
  id: string;
  name: string;
  kind: string;
  description: string;
  color: string;
  collection: string;
  style: "pixel-art" | "cute-3d";
}
export const referenceCharacters = seed.characters.filter(
  (c) => c.asset_status === "reference_only",
);
const originalIds = new Set(originals.map((c) => c.id as string));
const seen = new Set<string>(originalIds);
export const characterDefinitions: Character[] = [
  ...originals.map((c) => ({
    ...c,
    collection: "heykup pets Originals",
    style: "pixel-art" as const,
  })),
  {
    id: "soft-bear",
    name: "Maple",
    kind: "Animals",
    description: "Soft little bear · warm hugs, gentle company",
    color: "#f6e7d7",
    collection: "Soft Friends",
    style: "cute-3d",
  },
  ...seed.characters
    .filter((c) => {
      if (c.asset_status !== "planned" || seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .map((c) => ({
      id: c.id,
      name: c.name,
      collection: c.collection,
      kind: c.collection.includes("Fantasy") ? "Fantasy" : "People",
      style: c.style as "pixel-art" | "cute-3d",
      description: c.collection,
      color: c.style === "cute-3d" ? "#f9e4eb" : "#e8e4fa",
    })),
];
const ready = new Set(readyIds);
export const characters = characterDefinitions.filter(
  (c) => originalIds.has(c.id) || ready.has(c.id),
);
const byId = new Map(characterDefinitions.map((c) => [c.id, c]));
export function characterInfo(id: CharacterId): Character {
  const custom = getCustomCharacter(id);
  if (custom)
    return {
      id,
      name: custom.name,
      description: custom.personality,
      collection: "My Custom Characters",
      kind: "People",
      style: "cute-3d",
      color: "#fbe5ef",
    };
  return byId.get(id) ?? characters[0];
}
export function spriteGrid(id: CharacterId) {
  return characterInfo(id).style === "cute-3d" ? 64 : 32;
}
export function isCollectionCharacter(id: CharacterId) {
  return byId.has(id) && !originalIds.has(id);
}
