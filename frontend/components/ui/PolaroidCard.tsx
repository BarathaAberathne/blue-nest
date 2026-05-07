import Image from "next/image";

type PolaroidCardProps = {
  title: string;
  description: string;
  image: string;
  alt: string;
  accent: string;
};

export default function PolaroidCard({
  title,
  description,
  image,
  alt,
  accent,
}: PolaroidCardProps) {
  return (
    <article className="card flex flex-col h-full w-full overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_64px_rgba(90,74,66,0.22)] hover:scale-[1.015]">
      <div className="relative aspect-square w-full overflow-hidden">
        <Image src={image} alt={alt} fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="(max-width: 768px) 100vw, 25vw" />
      </div>
      <div
        className="flex flex-col flex-1 px-5 pb-6 pt-5"
        style={{ backgroundColor: `${accent}28` }}
      >
        <h3 className="card-title text-[var(--ink)]">{title}</h3>
        <p className="body-text mt-3">{description}</p>
      </div>
    </article>
  );
}
