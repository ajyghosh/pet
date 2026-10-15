import { characterInfo, type CharacterId } from "../core/characters";
import type { Animation, Coat } from "../core/settings";
export const atlasStates: Animation[] = [
  "idle",
  "walking",
  "sleeping",
  "jumping",
  "happy",
  "drinking",
];
/** PNG atlas generated from the same pixel runs used for native click regions. */
export function PetSprite({
  animation = "idle",
  frame = 0,
  coat = "slate",
  direction = 1,
  character = "alex",
}: {
  animation?: Animation;
  frame?: number;
  coat?: Coat;
  direction?: number;
  character?: CharacterId;
}) {
  const column = ((frame % 32) + 32) % 32;
  const row = atlasStates.indexOf(animation) * 2 + (direction < 0 ? 1 : 0);
  return (
    <div
      className={`pixel-pet ${characterInfo(character).style === "cute-3d" ? "rendered-pet" : ""}`}
      role="img"
      aria-label={`${characterInfo(character).name} companion`}
      data-character={character}
      style={{
        backgroundImage: `url(${import.meta.env.BASE_URL}characters/${character}-${coat}.png)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "3200% 1200%",
        backgroundPosition: `${(column / 31) * 100}% ${(row / 11) * 100}%`,
      }}
    />
  );
}
