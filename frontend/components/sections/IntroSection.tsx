import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

export default function IntroSection() {
  return (
    <section className="relative px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Doodle kind="heart" className="left-[2%] top-12 h-12 w-12 text-[#8bdde0]" />
      <Doodle kind="star" className="right-[6%] top-10 h-10 w-10 text-[#f3bf62]" />
      <Doodle kind="leaf" className="right-[10%] bottom-10 h-12 w-12 text-[#f4b2c9]" />

      <div className="container-site grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <Reveal>
          <span className="section-kicker">Our nurturing approach</span>
          <h2 className="section-title mt-6 max-w-xl text-[#58c5c7]">
            Montessori school for 3-month-olds to 5-year-olds
          </h2>
          <div className="section-subtitle max-w-xl space-y-5">
            <p>
              At Blue Nest Montessori School, we welcome babies and toddlers from 3 months up to 5 years old, ensuring they get the right start in life within a calm, supportive environment.
            </p>
            <p>
              We combine beautifully prepared classrooms, gentle routines and child-led discovery so children can build confidence, concentration and a genuine love of learning.
            </p>
          </div>
          <PastelButton href="/contact" variant="rose" className="mt-7">
            Contact us today
            <ArrowRight className="h-4 w-4" />
          </PastelButton>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="relative mx-auto min-h-[26rem] w-full max-w-[40rem]">
            <div className="absolute left-0 top-2 w-[68%] rotate-[-2deg] rounded-[2rem] bg-white p-3 shadow-[0_18px_40px_rgba(90,74,66,0.14)]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem]">
                <Image
                  src="/home/classroom-collage.png"
                  alt="Children enjoying Montessori activities"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 28vw"
                />
              </div>
            </div>
            <div className="absolute right-0 top-0 w-[38%] rotate-[6deg] rounded-[1.6rem] bg-white p-3 shadow-[0_16px_36px_rgba(90,74,66,0.14)]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.2rem]">
                <Image
                  src="/home/outdoor-childrens-play-area.jpg"
                  alt="Outdoor learning space"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 40vw, 16vw"
                />
              </div>
            </div>
            <div className="absolute bottom-0 right-10 w-[42%] rotate-[-5deg] rounded-[1.6rem] bg-white p-3 shadow-[0_16px_36px_rgba(90,74,66,0.14)]">
              <div className="relative aspect-[5/4] overflow-hidden rounded-[1.2rem]">
                <Image
                  src="/home/children-outdoor-play.jpg"
                  alt="Children playing outdoors"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 45vw, 18vw"
                />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
