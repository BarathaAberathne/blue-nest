import { Flower2, HeartHandshake, Lightbulb, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/ui/Motion";

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
    <section className="px-4 pb-8 pt-6 sm:px-6 lg:px-8 lg:pb-12">
      <div className="container-site">
        <Reveal>
          <div className="rounded-[2.5rem] bg-[rgba(255,253,249,0.72)] px-6 py-8 shadow-[0_12px_35px_rgba(90,74,66,0.08)] ring-1 ring-white/70 sm:px-8">
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-6">
              {values.map((value) => {
                const Icon = value.icon;

                return (
                  <div key={value.title} className="text-center xl:px-2">
                    <div
                      className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_10px_24px_rgba(90,74,66,0.08)]"
                      style={{ color: value.color }}
                    >
                      <Icon className="h-7 w-7" strokeWidth={1.8} />
                    </div>
                    <h3 className="mt-4 font-heading text-[2rem] leading-none" style={{ color: value.color }}>
                      {value.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[rgba(90,74,66,0.78)]">{value.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
