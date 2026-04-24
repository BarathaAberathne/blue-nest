import { Flower2, HeartHandshake, Lightbulb, Search, ShieldCheck, Sparkles } from "lucide-react";
import Doodle from "@/components/ui/Doodle";
import { Reveal } from "@/components/ui/Motion";

const rotations = [-3, 1.5, -2, 2.5, -1, 2];

const values = [
  {
    title: "Confidence",
    description: "We help children believe in themselves and their abilities.",
    color: "#ef8cab",
    icon: Sparkles,
  },
  {
    title: "Respect",
    description: "We nurture kindness, empathy and respect for others.",
    color: "#5fc8c7",
    icon: Flower2,
  },
  {
    title: "Independence",
    description: "Children are encouraged to explore, choose and grow at their own pace.",
    color: "#a48cdc",
    icon: Lightbulb,
  },
  {
    title: "Compassion",
    description: "Care, sharing and understanding are woven into every day.",
    color: "#f0bd55",
    icon: HeartHandshake,
  },
  {
    title: "Curiosity",
    description: "We spark curiosity and a love of learning that lasts.",
    color: "#63cad2",
    icon: Search,
  },
  {
    title: "Creativity",
    description: "Every child is invited to imagine, create and express themselves.",
    color: "#e683a4",
    icon: ShieldCheck,
  },
];

export default function ValuesSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-12">
      <Doodle kind="solidstar" className="left-[2%]   top-8    h-10 w-10 text-[#f7d774]" />
      <Doodle kind="rainbow"   className="right-[3%]  bottom-6 h-16 w-16" />
      <Doodle kind="flower"    className="left-[48%]  top-6    h-8  w-8  text-[#f4aac8]" />
      <Doodle kind="leaf"      className="right-[12%] top-10   h-9  w-9  text-[#7fd8d2]" />

      <div className="container-site">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {values.map((value, i) => {
            const Icon = value.icon;
            return (
              <Reveal key={value.title} delay={i * 0.06}>
                <div
                  className="rounded-[2.5rem] px-6 py-7"
                  style={{
                    transform: `rotate(${rotations[i]}deg)`,
                    background: `${value.color}20`,
                  }}
                >
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${value.color}22`, color: value.color }}
                  >
                    <Icon className="h-7 w-7" strokeWidth={1.8} />
                  </div>
                  <h3 className="mt-4 font-heading text-[1.8rem] leading-none" style={{ color: value.color }}>
                    {value.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[rgba(90,74,66,0.78)]">{value.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
