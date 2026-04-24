import { clsx } from "clsx";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  bgClass?: string;
  className?: string;
};

export default function PaperSection({ children, bgClass = "paper-bg", className }: Props) {
  return (
    <section className={clsx("relative overflow-hidden", bgClass, className)}>
      <div className="relative z-10">{children}</div>
    </section>
  );
}
