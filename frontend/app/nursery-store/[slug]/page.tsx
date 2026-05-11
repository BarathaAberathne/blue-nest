import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const name = slug.replace(/-/g, " ");
  return {
    title: `${name.charAt(0).toUpperCase() + name.slice(1)} — Blue Nest Store`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  return (
    <PublicLayout>
      <ProductDetailClient slug={slug} />
    </PublicLayout>
  );
}
