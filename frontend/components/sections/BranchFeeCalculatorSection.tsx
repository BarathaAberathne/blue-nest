import FeeCalculatorCard from "@/components/ui/FeeCalculatorCard";
import { Reveal } from "@/components/ui/Motion";

type BranchSlug = "harrow" | "pinner" | "borehamwood" | "pinner-green" | "northwood";

interface Props {
  branch:     BranchSlug;
  branchName: string;
  background?: "paper-bg" | "blush-bg";
}

export default function BranchFeeCalculatorSection({
  branch,
  branchName,
  background = "paper-bg",
}: Props) {
  return (
    <section
      id="fee-calculator"
      className={`${background} relative px-4 py-12 sm:px-6 lg:px-8 lg:py-16`}
    >
      <div className="container-site">
        <Reveal>
          <div className="mb-10 text-center">
            <span className="section-kicker">Fees made simple</span>
            <h2 className="section-title mt-4">
              Estimate Your {branchName} Fees
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="mx-auto w-full max-w-[27rem]">
            <FeeCalculatorCard defaultBranch={branch} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
