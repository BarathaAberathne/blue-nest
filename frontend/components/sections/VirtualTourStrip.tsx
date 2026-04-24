import { Bird, MoveRight } from "lucide-react";
import BlobButton from "@/components/ui/BlobButton";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export default function VirtualTourStrip() {
  return (
    <section className="chalk-bg relative overflow-hidden px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Doodle kind="star"   className="left-[3%]   top-8    h-10 w-10 text-white/70" />
      <Doodle kind="heart"  className="right-[5%]  top-10   h-9  w-9  text-[#f4aac8]" />
      <Doodle kind="cloud"  className="left-[25%]  bottom-8  h-12 w-12 text-white/50" />
      <Doodle kind="flower" className="right-[20%] bottom-6  h-10 w-10 text-[#f7d774]" />

      <div className="mx-auto max-w-6xl px-6 sm:px-10 lg:px-14">
        <Reveal>
          <div className="relative flex flex-col items-center justify-between gap-6 text-center text-white lg:flex-row lg:text-left">
            <div className="flex items-center gap-4">
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center bg-white/20"
                style={{ borderRadius: "62% 38% 46% 54% / 60% 44% 56% 40%" }}
              >
                <Bird className="h-7 w-7 text-[#f7d774]" />
              </span>
              <div>
                <p className="font-heading text-[2.4rem] leading-none sm:text-[2.8rem]">Take a Virtual Tour</p>
                <p className="mt-2 max-w-2xl text-base text-white/90 sm:text-lg">
                  Explore our bright classrooms, cozy reading corners and outdoor learning spaces before your visit.
                </p>
              </div>
            </div>
            <BlobButton href="/gallery" variant="blush" className="shrink-0">
              Start Exploring
              <MoveRight className="ml-2 h-5 w-5" />
            </BlobButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
