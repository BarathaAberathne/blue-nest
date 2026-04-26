import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

const pills = [
  { label: "Confidence",   color: "#ef8cab" },
  { label: "Respect",      color: "#5fc8c7" },
  { label: "Independence", color: "#7fd8d2" },
  { label: "Compassion",   color: "#f0bd55" },
  { label: "Curiosity",    color: "#63cad2" },
  { label: "Creativity",   color: "#e683a4" },
];

export default function ValuesSection() {
  return (
    <section className="relative px-4 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      {/* Ambient doodles — low opacity, stay out of content zone */}
      <Doodle kind="solidstar" className="left-[1%]   top-10   h-9  w-9  text-[#f7d774] opacity-60" />
      <Doodle kind="rainbow"   className="right-[2%]  bottom-8 h-16 w-16 opacity-50" />
      <Doodle kind="flower"    className="left-[46%]  top-7    h-8  w-8  text-[#f4aac8] opacity-55" />
      <Doodle kind="leaf"      className="right-[10%] top-12   h-9  w-9  text-[#7fd8d2] opacity-55" />
      <Doodle kind="cloud"     className="left-[6%]   bottom-10 h-10 w-10 text-[#85d6f1] opacity-40 hidden sm:block" />
      <Doodle kind="heart"     className="right-[22%] bottom-6  h-7  w-7  text-[#f49cb5] opacity-45 hidden sm:block" />

      <div className="container-site">

        {/* ── Kicker ─────────────────────────────────────────────── */}
        <Reveal>
          <p className="section-kicker text-center">Our core values</p>
        </Reveal>

        {/* ── Pill row ────────────────────────────────────────────── */}
        <Reveal delay={0.07}>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5 sm:gap-3">
            {pills.map((pill) => (
              <span
                key={pill.label}
                className="rounded-full border-[1.5px] px-5 py-2 font-body text-sm font-bold tracking-wide sm:px-6"
                style={{ borderColor: pill.color, color: pill.color }}
              >
                {pill.label}
              </span>
            ))}
          </div>
        </Reveal>

        {/* ── Quote block — main visual focus ─────────────────────── */}
        <Reveal delay={0.13}>
          <div className="mx-auto mt-14 max-w-3xl text-center sm:mt-16">

            {/* Opening mark */}
            <span
              className="font-heading text-[5rem] leading-none text-[#ef8cab] opacity-30 sm:text-[6.5rem]"
              aria-hidden="true"
            >
              &ldquo;
            </span>

            <p className="font-heading text-[1.65rem] leading-[1.65] text-[rgba(90,74,66,0.72)] sm:text-[2rem] lg:text-[2.2rem]">
              Tell me and I forget.{" "}
              <span className="text-[#5fc8c7]">Teach me and I remember.</span>{" "}
              Involve me and I learn.
            </p>

            <cite className="mt-5 block text-[0.7rem] font-extrabold uppercase not-italic tracking-[0.24em] text-[rgba(90,74,66,0.38)]">
              — Maria Montessori
            </cite>

            {/* Soft ornamental divider under quote */}
            <div className="mx-auto mt-8 flex items-center justify-center gap-3" aria-hidden="true">
              <div className="h-px w-16 bg-[rgba(90,74,66,0.12)]" />
              <div className="h-1.5 w-1.5 rounded-full bg-[#ef8cab] opacity-60" />
              <div className="h-px w-16 bg-[rgba(90,74,66,0.12)]" />
            </div>
          </div>
        </Reveal>

        {/* ── Two-column body text ─────────────────────────────────── */}
        <Reveal delay={0.2}>
          <div className="mx-auto mt-12 grid max-w-5xl gap-y-7 sm:mt-14 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0">

            {/* Left column */}
            <div className="body-text space-y-7">
              <p>
                At Blue Nest Montessori School, our day nursery offers a blend of structured learning
                and play, guided by the Montessori method. Our methods of teaching prioritise the EYFS
                in combination with our own Montessori methods, giving your child the best of both
                worlds. We serve families in Harrow, Pinner, and Borehamwood, with locations designed
                to create a stimulating environment for children aged 3 months to 5 years old.
              </p>
              <p>
                Our private nursery runs five days a week, from 7:30 am to 6 pm, and is ideal for
                working parents looking for a private daycare solution that supports their child&rsquo;s
                growth in a caring, safe space. Our nursery classrooms are spacious, filled with
                natural light, and equipped with the finest Montessori materials that encourage
                learning through play. We even have an eco-friendly forest school!
              </p>
            </div>

            {/* Right column */}
            <div className="body-text space-y-7">
              <p>
                We were awarded the Montessori School of the Year during the London Prestige Awards
                from 2019&ndash;2025, which went hand in hand with our Rated Good Ofsted report.
                Our quality of learning and ability to embrace fun sets us apart from other day
                nurseries.
              </p>
              <p>
                To learn more about our curriculum or to speak to our wonderful team,{" "}
                <a
                  href="/contact"
                  className="font-semibold text-[#5fc8c7] underline-offset-2 hover:underline"
                >
                  contact us today
                </a>
                .
              </p>
            </div>

          </div>
        </Reveal>

      </div>
    </section>
  );
}
