import { sprite, type Run } from "../core/sprite";
import type { Animation, Coat } from "../core/settings";
export function PixelSprite({
  runs,
  label = "Miso the cat",
}: {
  runs: Run[];
  label?: string;
}) {
  return (
    <svg
      className="pixel-pet"
      viewBox="0 0 32 32"
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      {runs.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.width}
          height="1"
          fill={r.color}
        />
      ))}
    </svg>
  );
}
export function PetSprite({
  animation = "idle",
  frame = 0,
  coat = "ginger",
  direction = 1,
}: {
  animation?: Animation;
  frame?: number;
  coat?: Coat;
  direction?: number;
}) {
  return <PixelSprite runs={sprite(animation, frame, coat, direction)} />;
}
