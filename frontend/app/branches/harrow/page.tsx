import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Blue Nest Montessori – Harrow" };

export default function HarrowBranchPage() {
  return (
    <PublicLayout>
      <section className="bg-brand-700 text-white py-16">
        <div className="container-site">
          <p className="text-brand-200 text-sm mb-2 uppercase tracking-wider font-medium">Our Branches</p>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Blue Nest Montessori – Harrow</h1>
          <p className="text-brand-100 max-w-xl leading-relaxed">
            Our flagship nursery in the heart of Harrow, offering a nurturing Montessori environment for children aged 3 months to 5 years.
          </p>
        </div>
      </section>

      <SectionWrapper>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card p-6">
            <h2 className="font-heading font-semibold text-gray-900 mb-3">📍 Address</h2>
            <p className="text-sm text-gray-600">Harrow, London, HA1</p>
          </div>
          <div className="card p-6">
            <h2 className="font-heading font-semibold text-gray-900 mb-3">📞 Contact</h2>
            <p className="text-sm text-gray-600">+44 20 0000 0001</p>
            <a href="mailto:harrow@bluenestmontessori.co.uk" className="text-sm text-brand-600 hover:underline block mt-1">
              harrow@bluenestmontessori.co.uk
            </a>
          </div>
          <div className="card p-6">
            <h2 className="font-heading font-semibold text-gray-900 mb-3">🕐 Hours</h2>
            <p className="text-sm text-gray-600">Monday – Friday</p>
            <p className="text-sm text-gray-600">07:30 – 18:30</p>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper tinted>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="section-title mb-4">Admissions</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We welcome children aged 3 months to 5 years. Places are limited — enquire early to avoid disappointment.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Government funding is accepted including 15-hour and 30-hour free childcare.
            </p>
            <Link href="/admission" className="btn-primary">Apply for a Place</Link>
          </div>
          <div className="aspect-video bg-brand-100 rounded-2xl flex items-center justify-center text-6xl text-brand-300">🌿</div>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="text-center max-w-xl mx-auto">
          <h2 className="section-title mb-4">Visit Us</h2>
          <p className="text-gray-600 mb-6">Book a visit to meet our team and see the nursery in person.</p>
          <Link href="/contact" className="btn-primary">Book a Tour</Link>
        </div>
      </SectionWrapper>
    </PublicLayout>
  );
}
