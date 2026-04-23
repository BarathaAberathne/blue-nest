import Image from "next/image";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

export default function GallerySection() {
  return (
    <section className="relative px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Doodle kind="flower" className="left-[8%] top-24 h-12 w-12 text-[#ef8cab]" />
      <Doodle kind="stars" className="right-[7%] top-20 h-12 w-12 text-[#8bcfef]" />

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
            <div className="relative min-h-[28rem]">
              <div className="absolute left-0 top-0 w-[58%] rotate-[-4deg] rounded-[2rem] bg-white p-3 shadow-[0_20px_42px_rgba(90,74,66,0.15)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem]">
                  <Image
                    src="/home/outdoor-learning-and-play-area.jpg"
                    alt="Montessori play area"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 70vw, 24vw"
                  />
                </div>
              </div>
              <div className="absolute right-2 top-4 w-[38%] rotate-[6deg] rounded-[1.6rem] bg-white p-3 shadow-[0_18px_38px_rgba(90,74,66,0.14)]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.3rem]">
                  <Image
                    src="/home/outdoor-childrens-play-area.jpg"
                    alt="Creative nursery corner"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 40vw, 16vw"
                  />
                </div>
              </div>
              <div className="absolute bottom-0 right-10 w-[46%] rotate-[-6deg] rounded-[1.6rem] bg-white p-3 shadow-[0_18px_38px_rgba(90,74,66,0.14)]">
                <div className="relative aspect-[5/4] overflow-hidden rounded-[1.3rem]">
                  <Image
                    src="/home/outdoor-play-for-children.jpg"
                    alt="Outdoor play for children"
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 45vw, 18vw"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
