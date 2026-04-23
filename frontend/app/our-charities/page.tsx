import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Our Charities" };

export default function OurCharitiesPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <h1 className="section-title mb-4">Our Charities</h1>
        <p className="section-subtitle max-w-2xl">
          Blue Nest Montessori is proud to support causes that align with our values of nurturing children, communities, and the natural world.
        </p>
      </PageWrapper>
      <SectionWrapper tinted>
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {["Children in Need", "Woodland Trust", "Magic Breakfast", "NSPCC"].map((c) => (
            <div key={c} className="card p-6">
              <div className="text-3xl mb-3">💚</div>
              <h3 className="font-heading font-semibold text-gray-900">{c}</h3>
              <p className="text-sm text-gray-500 mt-2">Details about our partnership and fundraising activities coming soon.</p>
            </div>
          ))}
        </div>
      </SectionWrapper>
    </PublicLayout>
  );
}
