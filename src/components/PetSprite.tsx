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
}: {
  animation?: Animation;
  frame?: number;
  coat?: Coat;
  direction?: number;
}) {
  const column = ((frame % 32) + 32) % 32;
  const row = atlasStates.indexOf(animation) * 2 + (direction < 0 ? 1 : 0);
  return (
    <div
      className="pixel-pet"
      role="img"
      aria-label="MiniMates human companion"
      style={{
        backgroundImage: `url(/characters/alex-${coat}.png)`,
        backgroundRepeat: "no-repeat",
        backgroundSize: "3200% 1200%",
        backgroundPosition: `${(column / 31) * 100}% ${(row / 11) * 100}%`,
      }}
    />
  );
}
