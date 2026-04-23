import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Blue Nest Montessori – Pinner" };

export default function PinnerBranchPage() {
  return (
    <PublicLayout>
      <section className="bg-brand-700 text-white py-16">
        <div className="container-site">
          <p className="text-brand-200 text-sm mb-2 uppercase tracking-wider font-medium">Our Branches</p>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold mb-4">Blue Nest Montessori – Pinner</h1>
          <p className="text-brand-100 max-w-xl leading-relaxed">
            Set in leafy Pinner, this branch combines outdoor Forest School activities with our signature Montessori curriculum.
          </p>
        </div>
      </section>

      <SectionWrapper>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="card p-6">
            <h2 className="font-heading font-semibold text-gray-900 mb-3">📍 Address</h2>
            <p className="text-sm text-gray-600">Pinner, London, HA5</p>
          </div>
          <div className="card p-6">
            <h2 className="font-heading font-semibold text-gray-900 mb-3">📞 Contact</h2>
            <p className="text-sm text-gray-600">+44 20 0000 0003</p>
            <a href="mailto:pinner@bluenestmontessori.co.uk" className="text-sm text-brand-600 hover:underline block mt-1">
              pinner@bluenestmontessori.co.uk
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
            <h2 className="section-title mb-4">Forest School at Pinner</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Our Pinner branch has a dedicated outdoor Forest School area where children explore the natural world
              every week alongside their indoor Montessori programme.
            </p>
            <Link href="/forest-school" className="btn-secondary mr-3">About Forest School</Link>
            <Link href="/admission" className="btn-primary">Apply for a Place</Link>
          </div>
          <div className="aspect-video bg-brand-100 rounded-2xl flex items-center justify-center text-6xl text-brand-300">🌳</div>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="text-center max-w-xl mx-auto">
          <h2 className="section-title mb-4">Visit Us</h2>
          <p className="text-gray-600 mb-6">Come and explore our leafy Pinner setting.</p>
          <Link href="/contact" className="btn-primary">Book a Tour</Link>
        </div>
      </SectionWrapper>
    </PublicLayout>
  );
}
