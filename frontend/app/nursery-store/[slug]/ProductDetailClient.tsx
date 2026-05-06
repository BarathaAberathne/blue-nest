"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";
import { addToCart, type CategorySlug, type StoreProduct } from "@/lib/store-cart";
import type { Product } from "@/types";

function fmt(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function categoryFromText(text: string): Exclude<CategorySlug, "all"> {
  const n = text.toLowerCase();
  if (n.includes("holiday club")) return "outdoor";
  if (n.includes("clothing") || n.includes("schoolwear") || n.includes("uniform") ||
      n.includes("polo") || n.includes("sweatshirt") || n.includes("t-shirt") || n.includes("tshirt")) return "clothing";
  if (n.includes("outdoor")) return "outdoor";
  if (n.includes("math")) return "maths";
  if (n.includes("literacy") || n.includes("book")) return "literacy";
  if (n.includes("life")) return "life-skills";
  if (n.includes("art") || n.includes("craft")) return "art";
  if (n.includes("sensory")) return "sensory";
  return "accessories";
}

function toStoreProduct(p: Product): StoreProduct {
  const category = categoryFromText(`${p.category ?? ""} ${p.name}`);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    category,
    tag: p.category?.trim() || "Store",
    emoji: category === "clothing" ? "👕" : "🛍️",
    sizes: p.sizes,
    imageUrls: p.image_urls,
  };
}

export default function ProductDetailClient({ slug }: { slug: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeImg, setActiveImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getProductBySlug(slug)
      .then((data) => setProduct(data as Product))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Product not found"),
      )
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 md:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-gray-100 animate-pulse" />
          <div className="space-y-4">
            {[80, 48, 32, 64, 40].map((w, i) => (
              <div key={i} className="h-4 rounded bg-gray-100 animate-pulse" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 md:px-8 text-center">
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3 inline-block">
          {error ?? "Product not found."}
        </p>
        <div className="mt-6">
          <Link href="/nursery-store" className="text-sm text-teal-600 hover:underline">
            ← Back to store
          </Link>
        </div>
      </div>
    );
  }

  const images = product.image_urls?.length
    ? product.image_urls
    : product.image_url
    ? [product.image_url]
    : [];

  const hasSizes = (product.sizes ?? []).length > 0;
  const mustPickSize = hasSizes && !selectedSize;
  const maxQty = product.stock_qty > 0 ? product.stock_qty : 99;

  const handleAddToCart = async () => {
    if (mustPickSize) return;
    setAddError(null);
    const token = getAccessToken();
    const sp = toStoreProduct(product);
    try {
      if (token) {
        await api.addCartItem(token, { product_id: product.id, qty, size: selectedSize });
      }
      for (let i = 0; i < qty; i++) {
        addToCart(sp, 1, selectedSize);
      }
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add to cart");
    }
  };

  const category = categoryFromText(`${product.category ?? ""} ${product.name}`);
  const catColours: Record<string, string> = {
    sensory: "#cf7d9c",
    outdoor: "#3d8a52",
    maths: "#5fc8c7",
    literacy: "#3aada9",
    "life-skills": "#c45820",
    accessories: "#a07a00",
    art: "#e8719a",
    clothing: "#9b59b6",
  };
  const catColour = catColours[category] ?? "#5a4a42";

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <Link
        href="/nursery-store"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to store
      </Link>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {/* ── Image gallery ── */}
        <div className="flex flex-col gap-3">
          {/* Main image */}
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
            {images.length > 0 ? (
              <Image
                src={images[activeImg]}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl">
                {category === "clothing" ? "👕" : "🛍️"}
              </div>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    activeImg === i
                      ? "border-[var(--ink)]"
                      : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <Image src={url} alt={`View ${i + 1}`} fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Product info ── */}
        <div className="flex flex-col gap-5">
          {/* Category tag */}
          <span
            className="inline-block self-start rounded-full px-3 py-0.5 text-xs font-bold"
            style={{ background: `${catColour}18`, color: catColour }}
          >
            {product.category?.trim() || "Store"}
          </span>

          <h1 className="font-heading text-2xl leading-snug text-[var(--ink)]">{product.name}</h1>

          <p className="font-heading text-3xl text-[var(--ink)]">{fmt(product.price)}</p>

          {product.description && (
            <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
          )}

          {/* Size selector */}
          {hasSizes && (
            <div>
              <p className="mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Age / Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes!.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size === selectedSize ? undefined : size)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                      selectedSize === size
                        ? "border-[var(--ink)] bg-[var(--ink)] text-white"
                        : "border-[rgba(90,74,66,0.25)] text-[rgba(90,74,66,0.65)] hover:border-[rgba(90,74,66,0.5)]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity stepper */}
          <div>
            <p className="mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">Quantity</p>
            <div className="inline-flex items-center rounded-full border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-semibold text-[var(--ink)]">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Add to Cart */}
          <button
            type="button"
            onClick={() => void handleAddToCart()}
            disabled={mustPickSize || added}
            className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold transition-all ${
              mustPickSize
                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                : added
                ? "bg-[#8ecb9b] text-white"
                : "bg-[var(--ink)] text-white hover:bg-[#3aada9]"
            }`}
          >
            {mustPickSize ? (
              "Pick a size first"
            ) : added ? (
              <><Check className="h-4 w-4" /> Added to cart</>
            ) : (
              <><ShoppingCart className="h-4 w-4" /> Add to cart</>
            )}
          </button>

          {addError && (
            <p className="text-xs text-red-500">{addError}</p>
          )}

          {product.stock_qty <= 0 && (
            <p className="text-xs text-amber-600">Currently out of stock</p>
          )}
        </div>
      </div>
    </div>
  );
}
