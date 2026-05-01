import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import PastelButton from "@/components/ui/PastelButton";

export default function FeesCTASection() {
  return (
    <section className="chalk-bg relative px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="container-site">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">

            <span
              className="section-kicker"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Fees &amp; funding
            </span>

            <h2 className="section-title mt-4 text-white">
              Flexible sessions with funding options available
            </h2>

            <p className="mt-5 text-base leading-7 text-white/75">
              Government funding of 15 or 30 hours per week may be available for eligible 2–5 year olds.
              Our team will help you understand exactly what you&apos;re entitled to.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <PastelButton href="/admission/our-fees" variant="cream">
                View Our Fees
              </PastelButton>
              <PastelButton href="/contact?enquiry=fee-enquiry" variant="blush">
                Get a Personalised Quote
                <ArrowRight className="h-4 w-4" />
              </PastelButton>
            </div>

          </div>
        </Reveal>
      </div>
    </section>
  );
}
