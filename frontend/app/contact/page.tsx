import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

export const metadata: Metadata = { title: "Contact Us" };

const branches = [
  { name: "Harrow", email: "harrow@bluenestmontessori.co.uk", phone: "+44 20 0000 0001", address: "Harrow, London, HA1" },
  { name: "Borehamwood", email: "borehamwood@bluenestmontessori.co.uk", phone: "+44 20 0000 0002", address: "Borehamwood, Hertfordshire, WD6" },
  { name: "Pinner", email: "pinner@bluenestmontessori.co.uk", phone: "+44 20 0000 0003", address: "Pinner, London, HA5" },
];

export default function ContactPage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <div className="max-w-4xl">
          <h1 className="section-title mb-4">Get in Touch</h1>
          <p className="section-subtitle mb-12">
            We&apos;d love to hear from you. Contact your nearest branch directly or send us a general enquiry below.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {branches.map((b) => (
              <div key={b.name} className="card p-6">
                <h3 className="font-heading font-semibold text-gray-900 mb-3">{b.name}</h3>
                <p className="text-sm text-gray-500 mb-1">{b.address}</p>
                <p className="text-sm text-gray-500 mb-1">{b.phone}</p>
                <a href={`mailto:${b.email}`} className="text-sm text-brand-600 hover:underline">{b.email}</a>
              </div>
            ))}
          </div>

          {/* Enquiry form placeholder */}
          <div className="card p-8 max-w-xl">
            <h2 className="text-xl font-heading font-semibold text-gray-900 mb-6">Send an Enquiry</h2>
            <div className="space-y-4">
              {[
                { label: "Your Name", type: "text", placeholder: "Jane Smith" },
                { label: "Email Address", type: "email", placeholder: "jane@example.com" },
                { label: "Phone Number", type: "tel", placeholder: "+44 7700 000000" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  placeholder="Tell us about your child and any questions you have..."
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>
              <button className="btn-primary w-full">Send Enquiry</button>
            </div>
          </div>
        </div>
      </PageWrapper>
    </PublicLayout>
  );
}
