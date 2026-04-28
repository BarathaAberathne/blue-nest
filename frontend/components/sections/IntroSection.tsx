import { ArrowRight } from "lucide-react";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import PaperSection from "@/components/ui/PaperSection";
import PastelButton from "@/components/ui/PastelButton";
import StickerCard from "@/components/ui/StickerCard";

export default function IntroSection() {
  return (
    <PaperSection className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <Doodle kind="blue-flower" className="left-[1%]   top-10   h-14 w-14 opacity-60" />
      <Doodle kind="blue-bird"   animated="float" className="absolute right-[18%] top-6 h-12 w-12 opacity-70" />
      <Doodle kind="leaf"        className="right-[9%]  bottom-8 h-12 w-12 opacity-55" />
      <Doodle kind="pink-flower" animated="subtle" className="absolute left-[68%] bottom-10 h-10 w-10 opacity-65" />

      <div className="container-site grid gap-8 lg:grid-cols-[1fr_1.05fr] lg:items-center">
        <Reveal>
          <span className="section-kicker">Our nurturing approach</span>
          <h2 className="section-title mt-4 max-w-xl text-[#58c5c7]">
            Montessori school for 3-month-olds to 5-year-olds
          </h2>
          <div className="section-subtitle max-w-xl space-y-6">
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
          <div className="relative mx-auto min-h-[28rem] w-full max-w-[42rem]">
            <StickerCard
              src="/home/children-outdoor-play.jpg"
              alt="Children outdoor play at Blue Nest"
              rotate={-4}
              sizes="(max-width: 1024px) 100vw, 28vw"
              className="absolute left-0 top-4 z-0 w-[68%]"
              aspectRatio="4/5"
            />
            <StickerCard
              src="/home/DSC_0177.jpg"
              alt="Blue Nest Montessori classroom"
              rotate={7}
              sizes="(max-width: 1024px) 40vw, 16vw"
              className="absolute right-[-5%] top-0 z-10 w-[41%]"
              aspectRatio="4/5"
            />
            <StickerCard
              src="/home/DSC_0151.jpg"
              alt="Children learning at Blue Nest"
              rotate={-5}
              sizes="(max-width: 1024px) 45vw, 18vw"
              className="absolute bottom-0 right-4 z-20 w-[46%]"
              aspectRatio="5/4"
            />
          </div>
        </Reveal>
      </div>
    </PaperSection>
  );
}
