import { Suspense } from "react";
import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import ContactPageClient from "@/components/contact/ContactPageClient";
import { faqPageJsonLd, generalFaqs } from "@/lib/faq";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact Us — Book a Visit at Blue Nest Montessori",
  description:
    "Book a nursery visit or ask about availability, fees and funded childcare at Blue Nest Montessori in Harrow (HA2), Pinner (HA5), Borehamwood (WD6) and Aldershot (GU12). Call 020 8861 5574 or send an enquiry to manager@bluenest.uk — we reply within one working day.",
  openGraph: {
    title: "Contact Us — Blue Nest Montessori",
    description:
      "Book a visit, ask about availability or fees at Blue Nest Montessori — Harrow, Pinner, Borehamwood and Aldershot.",
    url: "/contact",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Contact Blue Nest Montessori" }],
    type: "website",
  },
};

const faqJsonLd = faqPageJsonLd(generalFaqs);

export default function ContactPage() {
  return (
    <PublicLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <Suspense>
        <ContactPageClient />
      </Suspense>
    </PublicLayout>
  );
}
