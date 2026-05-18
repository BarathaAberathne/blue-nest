import type { Metadata } from "next";
import ApplicationFormClient from "./ApplicationFormClient";

export const metadata: Metadata = {
  alternates: { canonical: "/admission/application-form" },
  title: "Apply Online — Nursery Application",
  description:
    "Apply for a nursery place at Blue Nest Montessori in Harrow, Pinner or Borehamwood. Quick online application form — choose your branch, sessions and start week. We respond within two working days.",
  openGraph: {
    title: "Apply Online — Blue Nest Montessori",
    description:
      "Online nursery application form for Blue Nest Montessori in Harrow, Pinner and Borehamwood. Two-working-day response.",
    url: "/admission/application-form",
    images: [{ url: "/home/branches/harrow/harrow-home-hero.jpg", width: 1920, height: 1440, alt: "Blue Nest Montessori application form" }],
    type: "website",
  },
};

export default function ApplicationFormPage() {
  return <ApplicationFormClient />;
}
