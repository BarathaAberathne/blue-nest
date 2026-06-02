import { clsx } from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Variant palette — all kid-friendly, on-brand colours.
 *
 * Default state : solid fill + white (or ink) text
 * Hover state   : transparent bg + coloured border + coloured text
 *
 * border-2 border-transparent is always present to prevent
 * layout shift when the border appears on hover.
 */
export type PastelVariant =
  | "blush"    // soft pink      #f4aac8
  | "mint"     // deep teal      #237a74
  | "lavender" // soft purple    #7fd8d2
  | "peach"    // coral orange   #f9a078
  | "butter"   // sunny yellow   #f5c842  (ink text)
  | "sky"      // powder blue    #79c9ea
  | "rose"     // deep pink      #b23a63
  | "sage"     // muted green    #8ecb9b
  | "cream";   // warm cream     #e8cba4  (ink text)

const styles: Record<PastelVariant, string> = {
  blush:
    "bg-[#f4aac8]   border-2 border-transparent text-white      " +
    "hover:bg-transparent hover:border-[#f4aac8]   hover:text-[#f4aac8]",
  mint:
    "bg-[#237a74]   border-2 border-transparent text-white      " +
    "hover:bg-transparent hover:border-[#237a74]   hover:text-[#237a74]",
  lavender:
    "bg-[#7fd8d2]   border-2 border-transparent text-white      " +
    "hover:bg-transparent hover:border-[#7fd8d2]   hover:text-[#7fd8d2]",
  peach:
    "bg-[#f9a078]   border-2 border-transparent text-white      " +
    "hover:bg-transparent hover:border-[#f9a078]   hover:text-[#f9a078]",
  butter:
    "bg-[#f5c842]   border-2 border-transparent text-[var(--ink)] " +
    "hover:bg-transparent hover:border-[#f5c842]   hover:text-[#c89a00]",
  sky:
    "bg-[#79c9ea]   border-2 border-transparent text-white      " +
    "hover:bg-transparent hover:border-[#79c9ea]   hover:text-[#79c9ea]",
  rose:
    "bg-[#b23a63]   border-2 border-transparent text-white      " +
    "hover:bg-transparent hover:border-[#b23a63]   hover:text-[#b23a63]",
  sage:
    "bg-[#8ecb9b]   border-2 border-transparent text-white      " +
    "hover:bg-transparent hover:border-[#8ecb9b]   hover:text-[#8ecb9b]",
  cream:
    "bg-[#e8cba4]   border-2 border-transparent text-[var(--ink)] " +
    "hover:bg-transparent hover:border-[#c8a97c]   hover:text-[var(--ink)]",
};

type BaseProps = {
  children: ReactNode;
  className?: string;
  variant?: PastelVariant;
};

type LinkProps = BaseProps & { href: string };
type NativeButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;

function classes(variant: PastelVariant, className?: string) {
  return clsx(
    // base layout + typography
    "inline-flex items-center gap-2 justify-center rounded-full",
    "px-6 py-3 font-heading text-[1.45rem] leading-none tracking-[0.06em]",
    // smooth transition covers bg, border-color and text-color
    "transition-all duration-200 hover:-translate-y-0.5",
    styles[variant],
    className,
  );
}

export default function PastelButton(props: LinkProps | NativeButtonProps) {
  const { children, className, variant = "blush" } = props;

  if ("href" in props) {
    return (
      <Link href={props.href} className={classes(variant, className)}>
        {children}
      </Link>
    );
  }

  return (
    <button {...props} className={classes(variant, className)}>
      {children}
    </button>
  );
}
