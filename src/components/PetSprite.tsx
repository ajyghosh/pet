import { useLayoutEffect, useRef } from "react";
import {
  getCustomCharacter,
  type CustomCharacter,
} from "../core/customCharacters";
import { collectionSprite } from "../core/collectionArtwork";
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
  customCharacter,
}: {
  animation?: Animation;
  frame?: number;
  coat?: Coat;
  direction?: number;
  character?: CharacterId;
  customCharacter?: CustomCharacter;
}) {
  const custom = customCharacter ?? getCustomCharacter(character);
  const canvas = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    if (!custom) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 64, 64);
    for (const run of collectionSprite(
      custom.id,
      64,
      animation,
      ((Math.floor(frame) % 32) + 32) % 32,
      coat,
      direction,
      custom.appearance,
    )) {
      ctx.fillStyle = run.color;
      ctx.fillRect(run.x, run.y, run.width, 1);
    }
  }, [custom, animation, frame, coat, direction]);
  if (custom)
    return (
      <canvas
        ref={canvas}
        width={64}
        height={64}
        className="pixel-pet rendered-pet"
        role="img"
        aria-label={`${custom.name} companion`}
        data-character={custom.id}
      />
    );
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
