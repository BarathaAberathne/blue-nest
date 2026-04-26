import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import BlogClient from "@/components/blog/BlogClient";

export const metadata: Metadata = {
  title: "Blog — Blue Nest Montessori School",
  description:
    "Insights, updates, and resources from the Blue Nest Montessori team.",
};

export default function BlogPage() {
  return (
    <PublicLayout>
      <BlogClient />
    </PublicLayout>
  );
}
