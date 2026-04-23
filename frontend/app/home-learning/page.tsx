import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Home Learning" };

const resources = [
  { icon: "📖", title: "Activity Packs", desc: "Printable Montessori-inspired activities for different age groups." },
  { icon: "🎨", title: "Creative Ideas", desc: "Art and sensory play ideas you can set up in minutes at home." },
  { icon: "🌱", title: "Nature Activities", desc: "Simple outdoor activities that spark curiosity about the natural world." },
  { icon: "🔢", title: "Maths at Home", desc: "Everyday maths concepts brought to life through cooking, sorting, and play." },
];

export default function HomeLearningPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <h1 className="section-title mb-4">Home Learning</h1>
        <p className="section-subtitle max-w-2xl">
          Learning doesn&apos;t stop at the nursery gate. Here you&apos;ll find resources, ideas, and guides to bring
          the Montessori spirit into your home.
        </p>
      </PageWrapper>
      <SectionWrapper tinted>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {resources.map((r) => (
            <div key={r.title} className="card p-6">
              <div className="text-3xl mb-3">{r.icon}</div>
              <h3 className="font-heading font-semibold text-gray-900 mb-1">{r.title}</h3>
              <p className="text-sm text-gray-600">{r.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">Downloadable resources coming soon.</p>
      </SectionWrapper>
    </PublicLayout>
  );
}
