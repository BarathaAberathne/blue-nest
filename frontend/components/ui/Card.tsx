import { HTMLAttributes } from "react";
import { clsx } from "clsx";

export default function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("card p-6", className)} {...props}>
      {children}
    </div>
  );
}
