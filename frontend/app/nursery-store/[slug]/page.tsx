import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: { slug: string };
}

export function generateMetadata({ params }: Props): Metadata {
  const name = params.slug.replace(/-/g, " ");
  return {
    title: `${name.charAt(0).toUpperCase() + name.slice(1)} — Blue Nest Store`,
  };
}

export default function ProductDetailPage({ params }: Props) {
  return (
    <PublicLayout>
      <ProductDetailClient slug={params.slug} />
    </PublicLayout>
  );
}
