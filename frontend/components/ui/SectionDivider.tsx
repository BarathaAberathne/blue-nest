import { clsx } from "clsx";

type SectionDividerProps = {
  color?: string;
  className?: string;
  flip?: boolean;
};

export default function SectionDivider({
  color = "var(--paper)",
  className,
  flip = false,
}: SectionDividerProps) {
  return (
    <div className={clsx("pointer-events-none relative h-10 w-full overflow-hidden", className)}>
      <svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className={clsx("h-full w-full", flip && "rotate-180")}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0 57C74 30 151 18 230 24C298 29 347 65 417 70C500 76 545 35 624 29C724 21 779 76 882 74C997 72 1055 17 1171 24C1284 31 1350 65 1440 51V100H0V57Z"
          fill={color}
        />
      </svg>
    </div>
  );
}
