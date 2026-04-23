import { Cloud, Flower2, Heart, Leaf, Sparkles, Stars } from "lucide-react";
import { clsx } from "clsx";

const doodles = {
  heart: Heart,
  star: Sparkles,
  stars: Stars,
  leaf: Leaf,
  cloud: Cloud,
  flower: Flower2,
};

type DoodleProps = {
  kind: keyof typeof doodles;
  className?: string;
  color?: string;
};

export default function Doodle({ kind, className, color }: DoodleProps) {
  const Icon = doodles[kind];

  return (
    <span
      aria-hidden="true"
      className={clsx("pointer-events-none absolute opacity-80", className)}
      style={{ color }}
    >
      <Icon className="h-full w-full" strokeWidth={1.7} />
    </span>
  );
}
