import { Reveal } from "@/components/ui/Motion";
import Doodle from "@/components/ui/Doodle";
import PaperSection from "@/components/ui/PaperSection";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";

export default function GallerySection() {
  return (
    <PaperSection bgClass="blush-bg" className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Doodle kind="leaf"        className="left-[7%]   top-20    h-12 w-12 opacity-50" />
      <Doodle kind="blue-flower" animated="pulse"  className="absolute right-[12%] top-10 h-12 w-12 opacity-60" />
      <Doodle kind="pink-flower" animated="wiggle" className="absolute left-[8%]  bottom-6 h-10 w-10 opacity-55" />

      <div className="container-site">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <span className="section-kicker">A peek inside Blue Nest</span>
            <h2 className="section-title mt-4 text-[#58c5c7]">Warm spaces for play, calm focus and outdoor discovery</h2>
            <p className="section-subtitle max-w-xl">
              From carefully prepared classrooms to inviting garden areas, our environments are designed to feel comforting, creative and full of possibility.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <PastelButton href="/gallery" variant="mint">
                View Gallery
              </PastelButton>
              <PastelButton href="/contact" variant="peach">
                Book a Visit
              </PastelButton>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="relative min-h-[30rem]">
              <StickerCard
                src="/home/outdoor-learning-and-play-area.jpg"
                alt="Montessori play area"
                rotate={-5}
                sizes="(max-width: 1024px) 70vw, 24vw"
                className="absolute left-0 top-2 z-0 w-[60%]"
                aspectRatio="4/5"
              />
              <StickerCard
                src="/home/outdoor-childrens-play-area.jpg"
                alt="Creative nursery corner"
                rotate={7}
                sizes="(max-width: 1024px) 40vw, 16vw"
                className="absolute right-[-3%] top-0 z-10 w-[40%]"
                aspectRatio="4/5"
              />
              <StickerCard
                src="/home/outdoor-play-for-children.jpg"
                alt="Outdoor play for children"
                rotate={-5}
                sizes="(max-width: 1024px) 45vw, 18vw"
                className="absolute bottom-0 right-6 z-20 w-[48%]"
                aspectRatio="5/4"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </PaperSection>
  );
}
