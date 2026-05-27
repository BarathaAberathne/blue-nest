import CardImageSlider, { type SlideImage } from "@/components/ui/CardImageSlider";

type PolaroidCardProps = {
  title: string;
  description: string;
  images: SlideImage[];
  accent: string;
};

export default function PolaroidCard({
  title,
  description,
  images,
  accent,
}: PolaroidCardProps) {
  return (
    <article className="card flex flex-col h-full w-full overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_28px_64px_rgba(90,74,66,0.22)] hover:scale-[1.015]">
      <div className="relative aspect-square w-full overflow-hidden">
        <CardImageSlider
          images={images}
          sizes="(max-width: 768px) 100vw, 25vw"
          imageClassName="object-cover transition-transform duration-500 group-hover:scale-105"
          dotColor={accent}
          label={`${title} photos`}
        />
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
