import { ArrowRight } from "lucide-react";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

export default function FinalCTASection() {
  return (
    <section className="paper-bg relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <Doodle kind="blue-flower" animated="pulse"  className="absolute left-[7%]  top-12    h-12 w-12 opacity-50 hidden lg:block" />
      <Doodle kind="pink-bird"   animated="float"  className="absolute right-[7%] bottom-12 h-11 w-11 opacity-55 hidden lg:block" />

      <div className="container-site relative z-10">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="section-kicker">Ready to visit?</span>
            <h2 className="section-title mt-4">Book a Visit to Blue Nest</h2>
            <p className="section-subtitle mx-auto max-w-lg">
              Come and experience Blue Nest in person — see our classrooms, meet our team and
              discover why families across Harrow, Pinner and Borehamwood love us.
            </p>
            <div className="mt-8">
              <PastelButton
                href="/contact?enquiry=book-visit"
                variant="blush"
                className="px-8 py-4 text-[1.55rem]"
              >
                Book a Visit
                <ArrowRight className="h-5 w-5" />
              </PastelButton>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
