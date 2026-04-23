import type { Metadata } from "next";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";
import SectionWrapper from "@/components/ui/SectionWrapper";

export const metadata: Metadata = { title: "Admission" };

const steps = [
  { step: "01", title: "Submit an Enquiry", desc: "Fill in our online enquiry form with your preferred branch and your child's details." },
  { step: "02", title: "Book a Tour", desc: "Visit your chosen branch, meet our team, and see the environment for yourself." },
  { step: "03", title: "Application Form", desc: "Complete a formal application with your child's start date and session requirements." },
  { step: "04", title: "Settling-In Sessions", desc: "Gradual settling-in sessions help your child transition comfortably into nursery life." },
];

export default function AdmissionPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <div className="max-w-3xl">
          <h1 className="section-title">Admission</h1>
          <p className="section-subtitle">
            We welcome children from 3 months to 5 years across all three of our branches.
            Places are limited — we recommend enquiring early to avoid disappointment.
          </p>
        </div>
      </PageWrapper>

      <SectionWrapper tinted>
        <h2 className="section-title text-center mb-10">How to Apply</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {steps.map((s) => (
            <div key={s.step} className="card p-6">
              <span className="text-3xl font-heading font-bold text-brand-200">{s.step}</span>
              <h3 className="font-heading font-semibold text-gray-900 mt-2 mb-1">{s.title}</h3>
              <p className="text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link href="/contact" className="btn-primary">Start Your Enquiry</Link>
        </div>
      </SectionWrapper>

      <SectionWrapper>
        <div className="max-w-3xl">
          <h2 className="section-title mb-6">Funding & Fees</h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            We accept all government early-years funding schemes including 15-hour and 30-hour free childcare for eligible
            families. Our team will help you understand what you are entitled to and how to apply.
          </p>
          <p className="text-gray-600 leading-relaxed">
            For detailed fee schedules, please contact your nearest branch directly.
          </p>
        </div>
      </SectionWrapper>
    </PublicLayout>
  );
}
