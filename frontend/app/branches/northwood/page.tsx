import type { Metadata } from "next";
import { ArrowRight, Clock, Mail, MapPin } from "lucide-react";
import PublicLayout from "@/components/layout/PublicLayout";
import PastelButton from "@/components/ui/PastelButton";
import { Reveal } from "@/components/ui/Motion";
import BranchHero from "@/components/sections/BranchHero";

export const metadata: Metadata = {
  title: "Northwood — Blue Nest Montessori School (Coming Soon)",
  description:
    "Blue Nest Montessori School is expanding to Northwood, HA6. Register your interest now to be first in line for a place at our newest nursery.",
};

const details = [
  { icon: MapPin, label: "Location", value: "Northwood, London, HA6"  },
  { icon: Clock,  label: "Hours",   value: "Mon–Fri, 7:30am–6:00pm"  },
  { icon: Mail,   label: "Email",   value: "manager@bluenest.uk"       },
];

export default function NorthwoodBranchPage() {
  return (
    <PublicLayout>

      <BranchHero
        branch="northwood"
        location="Northwood, London · HA6"
        heading="Blue Nest Montessori is Coming to Northwood"
        description="We're excited to be expanding to Northwood. Our newest branch will bring the same outstanding Montessori education and warm, nurturing care to HA6 families. Register your interest to be first in line for a place."
        image="/home/outdoor-play-for-children-new.jpg"
        imageAlt="Blue Nest Montessori coming to Northwood"
        badge="Coming Soon"
        primaryCta={{ label: "Register Your Interest", href: "/contact?enquiry=northwood-interest", variant: "blush" }}
        secondaryCta={{ label: "Learn About Admissions", href: "/admission", variant: "mint" }}
      />

      {/* ══════════════════════════════════════════════════════
          WHAT TO EXPECT
      ══════════════════════════════════════════════════════ */}
      <section className="blush-bg relative px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="container-site">
          <Reveal>
            <div className="mb-12 text-center">
              <span className="section-kicker">What to expect</span>
              <h2 className="section-title mt-4">The Blue Nest Experience</h2>
              <p className="section-subtitle mx-auto max-w-xl">
                Every Blue Nest nursery offers the same high standard of Montessori education.
                Here&apos;s what you can look forward to in Northwood.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { emoji: "🌱", title: "Montessori Learning",    desc: "Child-led discovery with authentic Montessori materials that build independence and a genuine love of learning."  },
              { emoji: "🌳", title: "Forest School",          desc: "Outdoor adventures and nature exploration that build resilience, confidence and curiosity in every child."        },
              { emoji: "🍽️", title: "Healthy Halal Food",    desc: "Freshly prepared, nutritious halal meals and snacks carefully designed to fuel growing minds and bodies."         },
              { emoji: "🏡", title: "Safe Environment",       desc: "A warm, home-away-from-home where every child feels valued, secure and gently supported to thrive."              },
              { emoji: "📚", title: "EYFS Framework",         desc: "Our Montessori curriculum is delivered within the EYFS framework, ensuring the best of both approaches."         },
              { emoji: "🏆", title: "Award-winning Team",     desc: "The same dedicated, DBS-checked team behind our Montessori School of the Year (2019–2025) award."              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={0.07 * i}>
                <div className="flex h-full flex-col rounded-[2rem] bg-[var(--soft-white)] px-6 py-7 shadow-[0_10px_24px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.05)]">
                  <span className="mb-4 text-3xl" aria-hidden="true">{item.emoji}</span>
                  <h3 className="font-heading text-[1.4rem] leading-snug text-[var(--ink)]">{item.title}</h3>
                  <p className="body-text mt-3 flex-1 text-sm">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          REGISTER INTEREST
      ══════════════════════════════════════════════════════ */}
      <section className="paper-bg relative px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="container-site">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <div className="rounded-[2.5rem] bg-[var(--soft-white)] px-8 py-10 shadow-[0_16px_50px_rgba(90,74,66,0.10)] ring-1 ring-[rgba(90,74,66,0.06)] sm:px-12">

                <div className="mb-8 text-center">
                  <span className="section-kicker">Be first in line</span>
                  <h2 className="section-title mt-4">Register Your Interest</h2>
                  <p className="section-subtitle mx-auto mt-4 max-w-lg">
                    Places at our new Northwood nursery will be limited. Register now to receive
                    updates and priority access when we open.
                  </p>
                </div>

                {/* Details */}
                <div className="mb-8 grid gap-4 sm:grid-cols-3">
                  {details.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex flex-col items-center rounded-[1.5rem] bg-[rgba(127,216,210,0.08)] px-4 py-4 text-center ring-1 ring-[rgba(127,216,210,0.20)]">
                      <Icon className="mb-2 h-5 w-5 text-[#3aada9]" aria-hidden="true" />
                      <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                  <PastelButton href="/contact?enquiry=northwood-interest" variant="blush">
                    Register Interest
                    <ArrowRight className="h-4 w-4" />
                  </PastelButton>
                  <PastelButton href="/contact" variant="mint">
                    General Enquiry
                  </PastelButton>
                </div>

              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
}
