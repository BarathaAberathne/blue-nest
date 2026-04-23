import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Our Team" };

const teamPlaceholder = [
  { name: "Sarah Mitchell", role: "Nursery Manager – Harrow", initial: "S" },
  { name: "James Okafor", role: "Lead Practitioner – Borehamwood", initial: "J" },
  { name: "Priya Sharma", role: "Forest School Leader – Pinner", initial: "P" },
  { name: "Emily Chen", role: "SENCO", initial: "E" },
];

export default function OurTeamPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <h1 className="section-title mb-4">Our Team</h1>
        <p className="section-subtitle max-w-2xl">
          Our dedicated team of qualified early-years professionals is the heart of Blue Nest Montessori.
          Every member is DBS-checked, first-aid certified, and passionate about child-led education.
        </p>
      </PageWrapper>

      <SectionWrapper tinted>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {teamPlaceholder.map((m) => (
            <div key={m.name} className="card p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                {m.initial}
              </div>
              <h3 className="font-heading font-semibold text-gray-900">{m.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{m.role}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-8">Full team profiles coming soon.</p>
      </SectionWrapper>
    </PublicLayout>
  );
}
