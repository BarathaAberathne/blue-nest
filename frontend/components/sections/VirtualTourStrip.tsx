import { Bird, MoveRight } from "lucide-react";
import PastelButton from "@/components/ui/PastelButton";
import { Reveal } from "@/components/ui/Motion";

export default function VirtualTourStrip() {
  return (
    <section className="px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
      <div className="container-site">
        <Reveal>
          <div className="sketch-strip relative overflow-hidden rounded-[2.5rem] px-6 py-8 text-white shadow-[0_18px_40px_rgba(127,216,210,0.28)] sm:px-10">
            <div className="absolute inset-y-0 left-[-10%] w-1/3 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex flex-col items-center justify-between gap-5 text-center lg:flex-row lg:text-left">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
                  <Bird className="h-7 w-7 text-[var(--butter)]" />
                </span>
                <div>
                  <p className="font-heading text-[2.4rem] leading-none sm:text-[2.8rem]">Take a Virtual Tour</p>
                  <p className="mt-2 max-w-2xl text-base text-white/90 sm:text-lg">
                    Explore our bright classrooms, cozy reading corners and outdoor learning spaces before your visit.
                  </p>
                </div>
              </div>
              <PastelButton href="/gallery" variant="butter" className="shrink-0">
                Start Exploring
                <MoveRight className="ml-2 h-5 w-5" />
              </PastelButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
