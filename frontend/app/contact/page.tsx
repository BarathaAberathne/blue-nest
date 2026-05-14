import { Suspense } from "react";
import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import ContactPageClient from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  alternates: { canonical: "/contact" },
  title: "Contact Us — Blue Nest Montessori School",
  description:
    "Get in touch with Blue Nest Montessori School. Arrange a visit, ask about availability, or send an enquiry to our team in Harrow, Pinner, and Borehamwood.",
  openGraph: {
    title: "Contact Us — Blue Nest Montessori School",
    description:
      "Get in touch with Blue Nest Montessori. Arrange a visit, ask about availability, or send an enquiry.",
    url: "/contact",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Contact Blue Nest Montessori" }],
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <PublicLayout>
      <Suspense>
        <ContactPageClient />
      </Suspense>
    </PublicLayout>
  );
}
