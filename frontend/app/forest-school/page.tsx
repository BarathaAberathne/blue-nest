import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Forest School" };

const benefits = [
  { icon: "🌿", title: "Nature Immersion", desc: "Regular sessions in natural woodland environments build a lifelong connection with the natural world." },
  { icon: "🪵", title: "Practical Skills", desc: "Children learn to build, forage, identify plants, and care for living things." },
  { icon: "💪", title: "Physical Resilience", desc: "Climbing, balancing, and exploring outdoors develops gross motor skills and physical confidence." },
  { icon: "🧩", title: "Problem Solving", desc: "Unstructured outdoor play encourages creative thinking and collaborative problem solving." },
];

export default function ForestSchoolPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <div className="max-w-3xl">
          <h1 className="section-title">Forest School</h1>
          <p className="section-subtitle">
            Our Forest School programme brings learning to life in the great outdoors. Every week, children venture into
            natural settings where curiosity, risk, and discovery are actively encouraged.
          </p>
        </div>
      </PageWrapper>

      <SectionWrapper tinted>
        <h2 className="section-title text-center mb-10">Why Outdoor Learning Matters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {benefits.map((b) => (
            <div key={b.title} className="card p-6">
              <div className="text-3xl mb-3">{b.icon}</div>
              <h3 className="font-heading font-semibold text-gray-900 mb-2">{b.title}</h3>
              <p className="text-sm text-gray-600">{b.desc}</p>
            </div>
          ))}
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-3xl">
          <h2 className="section-title mb-6">Our Qualified Leaders</h2>
          <p className="text-gray-600 leading-relaxed">
            All Blue Nest Forest School sessions are led by Level 3 qualified practitioners who hold current paediatric first
            aid and outdoor safety certifications. Sessions are risk-benefit assessed and parent feedback is warmly welcomed.
          </p>
        </div>
      </SectionWrapper>
    </PublicLayout>
  );
}
