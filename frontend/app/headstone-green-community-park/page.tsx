import type { Metadata } from "next";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  MapPin,
  CalendarDays,
  Clock,
  Trees,
  Leaf,
  Users,
  Heart,
  Sprout,
  Footprints,
  Bird,
  PartyPopper,
  Accessibility,
  Dog,
  Bike,
  Info,
} from "lucide-react";
import { Reveal } from "@/components/ui/Motion";
import SiteHeader from "./_components/SiteHeader";
import SiteFooter from "./_components/SiteFooter";

export const metadata: Metadata = {
  alternates: { canonical: "/headstone-green-community-park" },
  title: "Headstone Green Park — A Community Green Space in Harrow",
  description:
    "Headstone Green Park is a community green space in Harrow cared for as part of Blue Nest Montessori's charity work — woodland trails, wildlife, family recreation and community events. Join us for our Opening Day celebration on Saturday 25 July 2026.",
  openGraph: {
    title: "Headstone Green Park — A Community Green Space in Harrow",
    description:
      "A community green space in the heart of Harrow where nature, wellbeing and local people come together. Opening Day celebration — Saturday 25 July 2026.",
    type: "website",
    url: "/headstone-green-community-park",
    images: [
      {
        url: "/site-images/headstone-green/hero-community-day.jpg",
        width: 1379,
        height: 1034,
        alt: "Community volunteers caring for the green at Headstone Green Park, Harrow",
      },
    ],
  },
};

// ── Content ───────────────────────────────────────────────────────────────────

const VALUES = [
  { icon: Users, title: "Community", desc: "Bringing local people together through shared green spaces and seasonal events." },
  { icon: Leaf, title: "Nature", desc: "Protecting habitats and nurturing local biodiversity for everyone to enjoy." },
  { icon: Heart, title: "Family", desc: "Safe, welcoming spaces for play, picnics and time together outdoors." },
  { icon: Sprout, title: "Sustainability", desc: "Caring for the environment for current and future generations of Harrow families." },
];

const PARK_LIFE = [
  { icon: Footprints, title: "Walking Trails", desc: "Peaceful routes for walking and jogging through woodland and open green spaces." },
  { icon: Bird, title: "Wildlife & Nature", desc: "Habitats supporting birds, pollinators and local biodiversity all year round." },
  { icon: PartyPopper, title: "Community Events", desc: "Seasonal events and activities bringing local residents together throughout the year." },
  { icon: Heart, title: "Family Recreation", desc: "Open spaces for play, relaxation and family gatherings in a safe environment." },
];

const EVENTS = [
  {
    tag: "Grand Opening",
    title: "Opening Day Celebration",
    date: "Saturday 25 July 2026",
    time: "11:00 – 16:00",
    desc: "Join us to officially open Headstone Green Park — live music, family games, food stalls, guided nature trails and a community tree-dedication. Free entry, everyone welcome.",
    featured: true,
  },
  {
    tag: "Family",
    title: "Family Picnic Weekend",
    date: "13 – 14 June 2026",
    time: "All day",
    desc: "Bring a blanket and enjoy live music, games and food stalls with the community.",
  },
  {
    tag: "Conservation",
    title: "Tree Planting Day",
    date: "Saturday 9 August 2026",
    time: "10:00 – 13:00",
    desc: "Help us plant native trees and expand the park's woodland canopy. Tools and guidance provided.",
  },
  {
    tag: "Wellbeing",
    title: "Outdoor Fitness Session",
    date: "Every Saturday",
    time: "09:00 – 10:00",
    desc: "Free, friendly group fitness in the fresh air. All abilities welcome.",
  },
];

const GALLERY = [
  { src: "/site-images/headstone-green/community-day.jpg", alt: "Children and families filling holes in the grass together during the September 2025 community day", caption: "Community Day" },
  { src: "/site-images/headstone-green/volunteers.jpg", alt: "Volunteers moving soil with a wheelbarrow across the green at Headstone Green Park", caption: "Volunteers at Work" },
  { src: "/site-images/headstone-green/restoring-the-green.jpg", alt: "Fresh soil being used to fill and level a hole in the grass", caption: "Restoring the Green" },
  { src: "/site-images/headstone-green/families.jpg", alt: "Families walking and playing together on the open green", caption: "Families Together" },
  { src: "/site-images/headstone-green/open-green-spaces.jpg", alt: "Wide open grassland at Headstone Green Park with homes beyond", caption: "Open Green Spaces" },
  { src: "/site-images/headstone-green/bench.jpg", alt: "A wooden bench beside the path at Headstone Green Park", caption: "Somewhere to Rest" },
];

const NOTICES = [
  { tag: "Event", title: "Opening Day — Volunteers Needed", desc: "We're pulling together for our 25 July opening celebration. Help with set-up, stalls and welcoming visitors.", posted: "Posted 6 June 2026" },
  { tag: "Recruitment", title: "Volunteer Recruitment", desc: "We're looking for friendly volunteers to support events, gardening and conservation work. All welcome.", posted: "Posted 28 May 2026" },
  { tag: "Conservation", title: "Wildlife Survey", desc: "Help record the birds, insects and plants that call our park home. No experience necessary.", posted: "Posted 14 May 2026" },
];

const VISIT = [
  { icon: Clock, title: "Opening Hours", desc: "Open daily from 7:00am to 9:00pm. Hours may vary on public holidays and during seasonal events." },
  { icon: MapPin, title: "Location", desc: "In the heart of Harrow, London. Easily reached by local bus routes, cycling and on foot." },
  { icon: Accessibility, title: "Accessibility", desc: "Step-free, surfaced paths suitable for wheelchairs and pushchairs, with accessible seating throughout." },
  { icon: Dog, title: "Dog Friendly", desc: "Dogs are welcome on designated trails and open areas. Please keep dogs under control and clean up." },
  { icon: Bike, title: "Cycling", desc: "Dedicated cycling paths and bike racks available. Please cycle considerately around pedestrians." },
  { icon: Info, title: "Facilities", desc: "Toilets, seating, picnic areas, drinking water and a children's play area across the park." },
];

// ── Reusable bits ───────────────────────────────────────────────────────────
const kicker = "text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6b7f5e]";
const heading = "mt-3 font-heading text-[2rem] leading-[1.12] text-[#1d3a26] sm:text-[2.5rem]";
const lead = "text-[15px] leading-relaxed text-[#55604c] sm:text-base";
const btnPrimary =
  "inline-flex items-center gap-2 rounded-full bg-[#2f5d3a] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#24492d]";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HeadstoneGreenParkPage() {
  return (
    <>
      <SiteHeader />

      <main id="home">
        {/* ── HERO ─────────────────────────────────────────── */}
        <section className="relative flex min-h-[86vh] items-center">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src="/site-images/headstone-green/hero-community-day.jpg"
              alt="Community volunteers caring for the open green at Headstone Green Park on the September 2025 community day"
              fill
              priority
              fetchPriority="high"
              quality={55}
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#16301f]/80 via-[#16301f]/45 to-transparent" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-6xl px-5 py-24 sm:px-8">
            <Reveal eager>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/85">
                <MapPin className="h-4 w-4" /> Harrow, London · Open Daily
              </p>
              <h1 className="mt-5 max-w-2xl font-heading text-[2.75rem] font-light leading-[1.05] text-white sm:text-[3.6rem] lg:text-[4rem]">
                A green space for the whole community
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85">
                Welcome to Headstone Green Park — where nature, wellbeing and local people
                come together. Cared for as part of the charity work of Blue Nest Montessori.
              </p>

              <a
                href="#opening"
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/30 backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <PartyPopper className="h-4 w-4" /> Opening Day — Saturday 25 July 2026
              </a>

              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#volunteer" className={btnPrimary}>
                  Get Involved <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#events"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Upcoming Events
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── OPENING DAY ──────────────────────────────────── */}
        <section id="opening" className="border-b border-[#e4e7da] bg-[#ecefe4]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
            <Reveal>
              <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
                <div className="flex flex-col items-center justify-center rounded-2xl bg-[#2f5d3a] px-10 py-8 text-center text-white sm:w-52">
                  <PartyPopper className="h-7 w-7" strokeWidth={1.5} />
                  <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Grand Opening</p>
                  <p className="mt-1 font-heading text-[1.7rem] leading-tight">
                    Sat 25 July<br />2026
                  </p>
                </div>
                <div>
                  <span className={kicker}>Save the date</span>
                  <h2 className="mt-3 font-heading text-[1.9rem] leading-tight text-[#1d3a26] sm:text-[2.3rem]">
                    Opening Day Celebration
                  </h2>
                  <p className={`${lead} mt-4 max-w-2xl`}>
                    Come and help us officially open Headstone Green Park. Expect live music,
                    family games, food stalls, guided nature trails and a community
                    tree-dedication — a joyful day for all the local families who make this
                    space special. Free entry, everyone welcome.
                  </p>
                  <a href="#volunteer" className={`${btnPrimary} mt-6`}>
                    Join the celebration <ArrowRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── ABOUT ────────────────────────────────────────── */}
        <section id="about" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div>
                <span className={kicker}>Our Park</span>
                <h2 className={heading}>About Headstone Green Park</h2>
                <p className={`${lead} mt-5`}>
                  Headstone Green Park is a valued community green space serving residents,
                  families, walkers, nature enthusiasts and local organisations throughout
                  Harrow.
                </p>
                <p className={`${lead} mt-4`}>
                  The park provides opportunities for recreation, relaxation, community
                  events, environmental education and biodiversity conservation — a quiet,
                  green heart for the neighbourhood to share.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="divide-y divide-[#e4e7da] border-t border-[#e4e7da]">
                {VALUES.map((item) => (
                  <div key={item.title} className="flex items-start gap-4 py-5">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ecefe4]">
                      <item.icon className="h-5 w-5 text-[#2f5d3a]" strokeWidth={1.7} />
                    </span>
                    <div>
                      <h3 className="font-heading text-lg text-[#1d3a26]">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-[#55604c]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── PARK LIFE ────────────────────────────────────── */}
        <section id="features" className="border-y border-[#e4e7da] bg-[#ecefe4]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <Reveal>
              <div className="max-w-2xl">
                <span className={kicker}>Park Life</span>
                <h2 className={heading}>Discover what the park offers</h2>
                <p className={`${lead} mt-4`}>
                  From peaceful trails to thriving wildlife, there is something here for everyone.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#dde2d2] bg-[#dde2d2] sm:grid-cols-2 lg:grid-cols-4">
              {PARK_LIFE.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.06}>
                  <article className="h-full bg-[#f6f5ee] px-7 py-8">
                    <item.icon className="h-7 w-7 text-[#2f5d3a]" strokeWidth={1.5} />
                    <h3 className="mt-5 font-heading text-xl text-[#1d3a26]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#55604c]">{item.desc}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── EVENTS ───────────────────────────────────────── */}
        <section id="events" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-28">
          <Reveal>
            <div className="max-w-2xl">
              <span className={kicker}>What&rsquo;s On</span>
              <h2 className={heading}>Community events</h2>
              <p className={`${lead} mt-4`}>
                Join your neighbours at one of our upcoming gatherings and activities.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 space-y-px overflow-hidden rounded-2xl border border-[#e4e7da]">
            {EVENTS.map((ev, i) => (
              <Reveal key={ev.title} delay={i * 0.05}>
                <article
                  className={`grid gap-4 px-6 py-7 sm:grid-cols-[200px_1fr] sm:gap-8 sm:px-8 ${
                    ev.featured ? "border-l-4 border-[#2f5d3a] bg-[#ecefe4]" : "bg-[#f6f5ee]"
                  }`}
                >
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                        ev.featured ? "bg-[#2f5d3a] text-white" : "bg-[#e4e7da] text-[#3a4733]"
                      }`}
                    >
                      {ev.tag}
                    </span>
                    <p className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#1d3a26]">
                      <CalendarDays className="h-4 w-4" /> {ev.date}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[#6b7f5e]">
                      <Clock className="h-4 w-4" /> {ev.time}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-heading text-xl text-[#1d3a26]">{ev.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#55604c]">{ev.desc}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── GALLERY ──────────────────────────────────────── */}
        <section id="gallery" className="border-y border-[#e4e7da] bg-[#ecefe4]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <Reveal>
              <div className="max-w-2xl">
                <span className={kicker}>Gallery</span>
                <h2 className={heading}>Moments from the park</h2>
                <p className={`${lead} mt-4`}>
                  Real moments from our community — including the September 2025 hole-filling
                  day, when local families came together to care for the green.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {GALLERY.map((img, i) => (
                <Reveal key={img.src} delay={i * 0.05}>
                  <figure className="group relative aspect-[4/3] overflow-hidden rounded-xl">
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-4 pb-3 pt-10 text-xs font-medium tracking-wide text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      {img.caption}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── NOTICE BOARD ─────────────────────────────────── */}
        <section id="notices" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
          <Reveal>
            <div className="max-w-2xl">
              <span className={kicker}>Community Notice Board</span>
              <h2 className={heading}>Latest notices &amp; updates</h2>
              <p className={`${lead} mt-4`}>
                News and announcements posted by our community volunteers. Check back regularly.
              </p>
            </div>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {NOTICES.map((n, i) => (
              <Reveal key={n.title} delay={i * 0.06}>
                <article className="flex h-full flex-col rounded-2xl border border-[#e4e7da] bg-[#f6f5ee] px-6 py-6">
                  <span className="inline-flex w-fit items-center rounded-full bg-[#ecefe4] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#3a4733]">
                    {n.tag}
                  </span>
                  <h3 className="mt-4 font-heading text-lg text-[#1d3a26]">{n.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-[#55604c]">{n.desc}</p>
                  <p className="mt-5 text-xs text-[#8a9580]">{n.posted}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── PLAN YOUR VISIT ──────────────────────────────── */}
        <section id="info" className="border-y border-[#e4e7da] bg-[#ecefe4]">
          <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 lg:py-24">
            <Reveal>
              <div className="max-w-2xl">
                <span className={kicker}>Plan Your Visit</span>
                <h2 className={heading}>Park information</h2>
                <p className={`${lead} mt-4`}>
                  Everything you need to know before you visit Headstone Green Park.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {VISIT.map((item, i) => (
                <Reveal key={item.title} delay={i * 0.05}>
                  <div className="border-t border-[#cfd6c4] pt-5">
                    <item.icon className="h-6 w-6 text-[#2f5d3a]" strokeWidth={1.6} />
                    <h3 className="mt-4 font-heading text-lg text-[#1d3a26]">{item.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[#55604c]">{item.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── GET INVOLVED ─────────────────────────────────── */}
        <section id="volunteer" className="bg-[#1d3a26]">
          <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-28">
            <Reveal>
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                <Trees className="h-7 w-7 text-[#a9c79a]" strokeWidth={1.6} />
              </span>
              <span className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.22em] text-[#9bb88c]">
                Join Us
              </span>
              <h2 className="mt-3 font-heading text-[2rem] leading-tight text-white sm:text-[2.6rem]">
                Get involved
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[#cdd9c2]">
                Help us keep Headstone Green Park beautiful by joining volunteer activities,
                community projects and local events — and don&rsquo;t miss our Opening Day
                celebration on Saturday 25 July 2026.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="https://bluenest.uk/contact"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1d3a26] transition-colors hover:bg-[#ecefe4]"
                >
                  Become a volunteer <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="https://bluenest.uk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Blue Nest Montessori <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
