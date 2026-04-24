import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import PaperSection from "@/components/ui/PaperSection";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";

export default function GallerySection() {
  return (
    <PaperSection bgClass="blush-bg" className="px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Doodle kind="flower"    className="left-[7%]   top-20 h-13 w-13 text-[#ef8cab]" />
      <Doodle kind="stars"     className="right-[6%]  top-16 h-13 w-13 text-[#8bcfef]" />
      <Doodle kind="heart"     className="left-[2%]   bottom-10 h-9 w-9 text-[#f4aac8]" />
      <Doodle kind="solidstar" className="right-[18%] bottom-8  h-8 w-8 text-[#f7d774]" />

      <div className="container-site">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal>
            <span className="section-kicker">A peek inside Blue Nest</span>
            <h2 className="section-title mt-6 text-[#58c5c7]">Warm spaces for play, calm focus and outdoor discovery</h2>
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
