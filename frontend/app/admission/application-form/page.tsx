import type { Metadata } from "next";
import ApplicationFormClient from "./ApplicationFormClient";

export const metadata: Metadata = {
  alternates: { canonical: "/admission/application-form" },
  title: "Application Form — Blue Nest Montessori School",
  description:
    "Apply for a place at Blue Nest Montessori School in Harrow, Pinner, or Borehamwood. Complete our simple online form and we'll be in touch within 2 working days.",
  openGraph: {
    title: "Application Form — Blue Nest Montessori School",
    description:
      "Apply for a nursery place at Blue Nest Montessori. Complete our form and we'll be in touch within 2 working days.",
    url: "/admission/application-form",
    images: [{ url: "/home/montessori-learning.jpeg", width: 1280, height: 854, alt: "Blue Nest Montessori application form" }],
    type: "website",
  },
};

export default function ApplicationFormPage() {
  return <ApplicationFormClient />;
}
