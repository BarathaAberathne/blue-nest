import type { LucideIcon } from "lucide-react";
import Image from "next/image";

type PolaroidCardProps = {
  title: string;
  description: string;
  image: string;
  alt: string;
  accent: string;
  icon: LucideIcon;
};

export default function PolaroidCard({
  title,
  description,
  image,
  alt,
  accent,
  icon: Icon,
}: PolaroidCardProps) {
  return (
    <article className="card p-3 flex flex-col h-full w-full transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(90,74,66,0.13)]">
      <div className="relative aspect-square overflow-hidden rounded-[1.7rem]">
        <Image src={image} alt={alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 25vw" />
      </div>
      <div className="flex flex-col flex-1 px-3 pb-5 pt-6">
        <div
          className="mb-5 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_24px_rgba(90,74,66,0.12)]"
          style={{ backgroundColor: accent }}
        >
          <Icon className="h-6 w-6" strokeWidth={1.8} />
        </div>
        <h3 className="card-title text-[var(--ink)]">
          {title}
        </h3>
        <p className="body-text mt-4">{description}</p>
      </div>
    </article>
  );
}
