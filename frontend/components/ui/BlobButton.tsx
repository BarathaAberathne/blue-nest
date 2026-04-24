import Link from "next/link";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export type BlobVariant = "blush" | "mint" | "lavender" | "butter" | "peach";

const styles: Record<BlobVariant, { bg: string; text: string; shadow: string }> = {
  blush:   { bg: "#f4aac8", text: "#fff",       shadow: "rgba(244,170,200,0.45)" },
  mint:    { bg: "#6ecfc9", text: "#fff",       shadow: "rgba(110,207,201,0.45)" },
  lavender:{ bg: "#b99fe0", text: "#fff",       shadow: "rgba(185,159,224,0.45)" },
  butter:  { bg: "#f5c842", text: "#5a4a42",   shadow: "rgba(245,200,66,0.45)"  },
  peach:   { bg: "#f9a078", text: "#fff",       shadow: "rgba(249,160,120,0.45)" },
};

type BaseProps = {
  children: ReactNode;
  variant?: BlobVariant;
  className?: string;
};

type LinkProps   = BaseProps & { href: string };
type ButtonProps = BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>;

const blobRadii: Record<BlobVariant, string> = {
  blush:    "55% 45% 45% 55% / 65% 58% 42% 42%",
  mint:     "45% 55% 62% 38% / 52% 46% 66% 54%",
  lavender: "58% 42% 48% 52% / 60% 44% 56% 40%",
  butter:   "42% 58% 55% 45% / 46% 62% 38% 56%",
  peach:    "52% 48% 42% 58% / 60% 40% 64% 36%",
};

function blobClasses(variant: BlobVariant, className?: string) {
  const s = styles[variant];
  return {
    className: clsx(
      "inline-flex items-center justify-center gap-2",
      "px-7 py-3 font-display text-[1.5rem] leading-none tracking-wide",
      "transition-all duration-200 hover:-translate-y-1.5 hover:scale-[1.04] active:translate-y-0 active:scale-100",
      className,
    ),
    style: {
      background: s.bg,
      color: s.text,
      borderRadius: blobRadii[variant],
      boxShadow: `5px 7px 0 ${s.shadow}`,
    } as React.CSSProperties,
  };
}

export default function BlobButton(props: LinkProps | ButtonProps) {
  const { children, variant = "blush", className } = props;
  const { className: cls, style } = blobClasses(variant, className);

  if ("href" in props) {
    return (
      <Link href={props.href} className={cls} style={style}>
        {children}
      </Link>
    );
  }

  const { href: _href, variant: _v, ...rest } = props as ButtonProps & { href?: string; variant?: BlobVariant };
  return (
    <button {...rest} className={cls} style={style}>
      {children}
    </button>
  );
}
