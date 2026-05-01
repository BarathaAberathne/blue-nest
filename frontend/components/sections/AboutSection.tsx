import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

export default function AboutSection() {
  return (
    <section className="paper-bg relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <Doodle kind="leaf"        className="absolute left-[3%]  top-20    h-10 w-10 opacity-45 hidden lg:block" />
      <Doodle kind="pink-flower" animated="subtle" className="absolute right-[4%] bottom-16 h-10 w-10 opacity-50 hidden lg:block" />

      <div className="container-site relative z-10">

        {/* Header */}
        <Reveal>
          <div className="mb-12 text-center">
            <span className="section-kicker">Our philosophy</span>
            <h2 className="section-title mt-4">The Montessori difference</h2>
          </div>
        </Reveal>

        {/* Quote */}
        <Reveal delay={0.07}>
          <blockquote className="mx-auto mb-14 max-w-3xl text-center">
            <p className="font-heading text-[1.65rem] leading-[1.6] text-[var(--ink)] sm:text-[1.9rem]">
              &ldquo;Tell me and I forget. Teach me and I remember. Involve me and I learn.&rdquo;
            </p>
            <cite className="mt-4 block text-[0.68rem] font-bold uppercase not-italic tracking-[0.24em] text-[var(--muted)]">
              — Maria Montessori
            </cite>
          </blockquote>
        </Reveal>

        {/* Two-column body */}
        <Reveal delay={0.13}>
          <div className="mx-auto grid max-w-5xl gap-y-8 lg:grid-cols-2 lg:gap-x-16 lg:gap-y-0">
            <div className="body-text space-y-6">
              <p>
                At Blue Nest Montessori School, our day nursery offers a blend of structured learning and
                play, guided by the Montessori method. We prioritise the EYFS curriculum in combination
                with our own Montessori approach, giving your child the best of both worlds. We serve
                families in Harrow, Pinner and Borehamwood.
              </p>
              <p>
                Our private nursery runs five days a week, from 7:30 am to 6 pm — ideal for working
                parents looking for a high-quality daycare that truly supports their child&apos;s growth
                in a caring, safe space.
              </p>
            </div>
            <div className="body-text space-y-6">
              <p>
                Our spacious, light-filled classrooms are equipped with the finest Montessori materials
                that encourage learning through play. We even have an eco-friendly forest school that
                connects children with nature and builds lifelong resilience.
              </p>
              <p>
                Awarded Montessori School of the Year at the London Prestige Awards from 2019–2025,
                and holding an Ofsted Good rating, our quality of learning and ability to embrace fun
                sets us apart from other nurseries.
              </p>
            </div>
          </div>
        </Reveal>

      </div>
    </section>
  );
}
