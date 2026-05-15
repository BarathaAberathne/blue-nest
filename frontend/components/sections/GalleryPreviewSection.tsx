import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

const images = [
  { src: "/home/branches/harrow/harrow-preview-01.webp", alt: "Children playing in the wisteria-shaded garden at Blue Nest Montessori",          wide: true  },
  { src: "/home/branches/harrow/harrow-preview-02.webp", alt: "Children and teacher exploring an ocean sensory bin at Blue Nest Montessori",     wide: false },
  { src: "/home/branches/harrow/harrow-preview-03.webp", alt: "Child playing inside a wooden tunnel with rainbow scarves at Blue Nest Montessori", wide: false },
  { src: "/home/branches/harrow/harrow-preview-04.webp", alt: "Children at the ice-cream parlour role-play area at Blue Nest Montessori",        wide: false },
  { src: "/home/branches/harrow/harrow-preview-05.webp", alt: "Blue Nest Montessori teacher with two toddlers at the outdoor water table",       wide: false },
  { src: "/home/branches/harrow/harrow-preview-06.webp", alt: "Child concentrating on a Montessori writing activity at Blue Nest",               wide: false },
];

export default function GalleryPreviewSection() {
  return (
    <section className="paper-bg relative px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="container-site">

        {/* Header row */}
        <Reveal>
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-kicker">Life at Blue Nest</span>
              <h2 className="section-title mt-4">A glimpse inside our nurseries</h2>
            </div>
            <PastelButton href="/gallery" variant="mint" className="shrink-0 self-start sm:self-auto">
              View Gallery
              <ArrowRight className="h-4 w-4" />
            </PastelButton>
          </div>
        </Reveal>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {images.map((img, i) => (
            <Reveal key={img.src} delay={0.05 * i} className={img.wide ? "col-span-2 lg:col-span-1" : ""}>
              <div
                className={`relative overflow-hidden rounded-[1.5rem] ${
                  img.wide ? "aspect-[16/9] lg:aspect-square" : "aspect-square"
                }`}
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes={img.wide
                    ? "(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 33vw"
                    : "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"}
                />
                <div className="absolute inset-0 bg-[rgba(90,74,66,0)] transition-colors duration-300 hover:bg-[rgba(90,74,66,0.05)]" />
              </div>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
