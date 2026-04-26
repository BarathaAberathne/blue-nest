import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import ContactPageClient from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us — Blue Nest Montessori School",
  description:
    "Get in touch with Blue Nest Montessori School. Arrange a visit, ask about availability, or send an enquiry to our team in Harrow, Pinner, and Borehamwood.",
};

export default function ContactPage() {
  return (
    <PublicLayout>
      <ContactPageClient />
    </PublicLayout>
  );
}
