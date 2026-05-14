import type { Metadata } from "next";
import Script from "next/script";
import PublicLayout from "@/components/layout/PublicLayout";
import ProductDetailClient from "./ProductDetailClient";

interface Props {
  params: Promise<{ slug: string }>;
}

interface ApiProduct {
  name?: string;
  description?: string;
  price?: number;     // pence
  currency?: string;
  image_url?: string;
  image_urls?: string[];
  is_active?: boolean;
  stock_qty?: number;
}

async function fetchProduct(slug: string): Promise<ApiProduct | null> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_INTERNAL_URL
      ?? process.env.NEXT_PUBLIC_API_URL
      ?? "http://localhost:8080";
    const res = await fetch(`${apiBase}/api/v1/products/slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const body = await res.json() as { data?: ApiProduct };
    return body.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);
  const fallback = slug.replace(/-/g, " ");
  const display = product?.name ?? `${fallback.charAt(0).toUpperCase() + fallback.slice(1)}`;
  const title = `${display} — Blue Nest Store`;
  const url = `/nursery-store/${slug}`;
  const description = product?.description
    ?? `Buy ${display} from Blue Nest Montessori — childcare sessions, uniform and Montessori-aligned supplies. Free UK delivery on orders over £30.`;
  const image = product?.image_url ?? "/home/montessori-learning.jpeg";
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [{ url: image, alt: display }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  // Product JSON-LD — emit only when we have real catalogue data so Google
  // doesn't see placeholder/empty offers. Price comes back in pence.
  const productJsonLd = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.image_urls && product.image_urls.length > 0
      ? product.image_urls.map((u) => u.startsWith("http") ? u : `https://bluenest.uk${u}`)
      : (product.image_url ? [product.image_url.startsWith("http") ? product.image_url : `https://bluenest.uk${product.image_url}`] : undefined),
    brand: { "@type": "Brand", name: "Blue Nest Montessori" },
    offers: typeof product.price === "number" ? {
      "@type": "Offer",
      price: (product.price / 100).toFixed(2),
      priceCurrency: (product.currency ?? "gbp").toUpperCase(),
      availability: product.is_active && (product.stock_qty ?? 0) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `https://bluenest.uk/nursery-store/${slug}`,
    } : undefined,
  } : null;

  return (
    <PublicLayout>
      {productJsonLd && (
        <Script
          id={`product-jsonld-${slug}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
      <ProductDetailClient slug={slug} />
    </PublicLayout>
  );
}
