import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

type Props = {
  kicker: string;
  title: string;
  intro: string;
  children: React.ReactNode;
};

export default function LegalPageShell({ kicker, title, intro, children }: Props) {
  return (
    <PublicLayout>
      {/* ──────────────────────────────────────────────────────────
          HERO — kicker + h1 + intro
      ────────────────────────────────────────────────────────── */}
      <section className="paper-bg relative overflow-hidden">
        <Doodle kind="leaf" className="left-[6%] top-10 h-9 w-9 opacity-50 hidden sm:block" />
        <Doodle kind="pink-flower" className="right-[7%] top-14 h-8 w-8 opacity-50 hidden sm:block" />

        <div className="container-site relative z-10 py-14 sm:py-20">
          <Reveal eager>
            <span className="section-kicker">{kicker}</span>
            <h1 className="mt-4 font-heading text-[2.5rem] leading-[1.1] text-[var(--ink)] sm:text-[3rem] lg:text-[3.4rem] max-w-3xl">
              {title}
            </h1>
            <p className="section-subtitle max-w-2xl">{intro}</p>
          </Reveal>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          BODY — blog-prose styling for headings / lists / links
      ────────────────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="container-site py-12 sm:py-16">
          <Reveal>
            <article className="blog-prose mx-auto max-w-3xl">
              {children}
            </article>
          </Reveal>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          CTA — link to contact for further questions
      ────────────────────────────────────────────────────────── */}
      <section className="paper-bg">
        <div className="container-site py-12 sm:py-16">
          <Reveal>
            <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-[1.6rem] bg-white p-7 shadow-[0_4px_16px_rgba(90,74,66,0.08)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-heading text-[1.5rem] leading-tight text-[var(--ink)] sm:text-[1.7rem]">
                  Questions about this policy?
                </h2>
                <p className="mt-1 text-[0.92rem] leading-[1.65] text-[rgba(90,74,66,0.85)]">
                  Email <a className="font-bold text-[#3aada9] underline underline-offset-2" href="mailto:manager@bluenest.uk">manager@bluenest.uk</a> or reach the team via our contact page.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#6ecfc9] px-5 py-2.5 text-[0.85rem] font-extrabold text-white transition hover:bg-[#3aada9]"
              >
                Contact us
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </PublicLayout>
  );
}
