import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Why Montessori" };

const principles = [
  { icon: "🧠", title: "Child-Led Learning", desc: "Children choose their activities within a structured environment, developing intrinsic motivation and deep focus." },
  { icon: "🤝", title: "Mixed-Age Groups", desc: "Older children mentor younger ones, building empathy and reinforcing their own knowledge." },
  { icon: "🎯", title: "Prepared Environment", desc: "Every material, surface, and detail is intentionally designed to invite exploration and independence." },
  { icon: "📏", title: "Freedom with Limits", desc: "Children move, speak, and work freely within clear boundaries that build self-discipline." },
  { icon: "🌱", title: "Holistic Development", desc: "Social, emotional, physical, and cognitive growth are nurtured as one interconnected whole." },
  { icon: "🔍", title: "Intrinsic Motivation", desc: "No grades, no gold stars — children learn for the joy of discovery, not external reward." },
];

export default function WhyMontessoriPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <div className="max-w-3xl">
          <h1 className="section-title">Why Montessori?</h1>
          <p className="section-subtitle">
            Developed by Dr Maria Montessori over a century ago, the Montessori method is one of the most researched and respected
            educational approaches in the world. At Blue Nest, we have made it the heart of everything we do.
          </p>
        </div>
      </PageWrapper>

      <SectionWrapper tinted>
        <h2 className="section-title text-center mb-10">Core Principles</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {principles.map((p) => (
            <div key={p.title} className="card p-6">
              <div className="text-3xl mb-3">{p.icon}</div>
              <h3 className="font-heading font-semibold text-gray-900 mb-2">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-3xl mx-auto">
          <h2 className="section-title mb-6">What the Research Says</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Longitudinal studies consistently show that children educated in Montessori environments develop stronger executive
            function, reading, and mathematics skills — alongside superior social and emotional competencies — compared to peers
            in traditional settings.
          </p>
          <p className="text-gray-600 leading-relaxed">
            At Blue Nest, we combine the timeless Montessori philosophy with modern early-years research to give every child
            the very best start.
          </p>
        </div>
      </SectionWrapper>
    </PublicLayout>
  );
}
