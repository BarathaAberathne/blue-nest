"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ShoppingCart, X } from "lucide-react";
import PastelButton from "@/components/ui/PastelButton";
import { addToCart, type CategorySlug, type StoreProduct } from "@/lib/store-cart";
import type { Product } from "@/types";
import { api } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const CATEGORIES: { value: CategorySlug; label: string; colour: string }[] = [
  { value: "all",          label: "All",         colour: "#5a4a42" },
  { value: "sensory",      label: "Sensory",      colour: "#cf7d9c" },
  { value: "outdoor",      label: "Outdoor",      colour: "#3d8a52" },
  { value: "maths",        label: "Maths",        colour: "#5fc8c7" },
  { value: "literacy",     label: "Literacy",     colour: "#3aada9" },
  { value: "life-skills",  label: "Life Skills",  colour: "#c45820" },
  { value: "accessories",  label: "Accessories",  colour: "#a07a00" },
  { value: "art",          label: "Art & Craft",  colour: "#e8719a" },
];

const CAT_BG: Record<Exclude<CategorySlug, "all">, string> = {
  sensory:       "rgba(244,170,200,0.18)",
  outdoor:       "rgba(142,203,155,0.20)",
  maths:         "rgba(127,216,210,0.18)",
  literacy:      "rgba(127,216,210,0.18)",
  "life-skills": "rgba(249,160,120,0.18)",
  accessories:   "rgba(247,215,116,0.22)",
  art:           "rgba(232,113,154,0.14)",
};

function fmt(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

function categoryFromText(text: string): Exclude<CategorySlug, "all"> {
  const normalized = text.toLowerCase();
  if (normalized.includes("outdoor") || normalized.includes("holiday")) return "outdoor";
  if (normalized.includes("math")) return "maths";
  if (normalized.includes("literacy") || normalized.includes("book")) return "literacy";
  if (normalized.includes("life")) return "life-skills";
  if (normalized.includes("art") || normalized.includes("craft")) return "art";
  if (normalized.includes("sensory")) return "sensory";
  return "accessories";
}

function mapProduct(product: Product): StoreProduct {
  const tag = product.category?.trim() || "Store";
  const category = categoryFromText(`${product.category ?? ""} ${product.name}`);
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    category,
    tag,
    emoji: "🛍️",
  };
}

// ── Add-to-cart button ────────────────────────────────────────────────────────
// Self-contained: manages its own "added" flash state.

function AddButton({ product }: { product: StoreProduct }) {
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
  const token = getAccessToken();

  try {
    if (token) {
      await api.addCartItem(token, { product_id: product.id, qty: 1 });
    }

    addToCart(product);

    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  } catch (err) {
    console.error("Failed to add item to cart", err);
  }
};

  return (
    <button
      onClick={() => void handleAdd()}
      aria-label="Add to cart"
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[0.7rem] font-bold transition-all duration-200 ${
        added
          ? "bg-[#8ecb9b] text-white"
          : "bg-[var(--ink)] text-white hover:bg-[#3aada9]"
      }`}
    >
      {added ? (
        <><Check className="h-3 w-3" /> Added</>
      ) : (
        <><ShoppingCart className="h-3 w-3" /> Add</>
      )}
    </button>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: StoreProduct }) {
  const cat     = CATEGORIES.find((c) => c.value === product.category);
  const catBg   = CAT_BG[product.category];
  const catColour = cat?.colour ?? "#5a4a42";

  return (
    <article className="group flex flex-col overflow-hidden rounded-[1.4rem] bg-white shadow-[0_2px_12px_rgba(90,74,66,0.07)] ring-1 ring-[rgba(90,74,66,0.04)] transition-shadow duration-200 hover:shadow-[0_6px_20px_rgba(90,74,66,0.12)]">
      {/* Image / emoji area */}
      <div
        className="relative flex aspect-square items-center justify-center text-4xl"
        style={{ background: catBg }}
      >
        <span role="img" aria-hidden="true">{product.emoji}</span>
        {product.badge && (
          <span
            className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-wide text-white"
            style={{ backgroundColor: catColour }}
          >
            {product.badge}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 px-3 py-3">
        <span
          className="inline-block self-start rounded-full px-2 py-0.5 text-[0.60rem] font-bold"
          style={{ background: `${catColour}18`, color: catColour }}
        >
          {product.tag}
        </span>

        <p className="font-heading text-[0.95rem] leading-tight text-[var(--ink)] line-clamp-2">
          {product.name}
        </p>

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="font-heading text-[1rem] text-[var(--ink)]">{fmt(product.price)}</span>
          <AddButton product={product} />
        </div>
      </div>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function StoreClient() {
  const [activeCategory, setActiveCategory] = useState<CategorySlug>("all");
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const list = await api.getProducts();
        if (!alive) return;
        const safeList = Array.isArray(list) ? (list as Product[]) : [];
        setProducts(safeList.map(mapProduct));
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    void run();
    return () => {
      alive = false;
    };
  }, []);

  const filtered =
    activeCategory === "all"
      ? products
      : products.filter((p) => p.category === activeCategory);

  return (
    <>
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="paper-bg px-4 pb-5 pt-10 sm:px-6 lg:px-8">
        <div className="container-site">
          <h1 className="font-heading text-[2.2rem] leading-none text-[var(--ink)]">
            Nursery Store
          </h1>
          <p className="mt-1.5 text-sm text-[rgba(90,74,66,0.52)]">
            Montessori-inspired materials and home learning resources — handpicked by our educators
          </p>
          {/* Store stats */}
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
            {[
              "Free delivery over £30",
              "Secure checkout",
              "Educator-approved",
            ].map((s) => (
              <span key={s} className="flex items-center gap-1.5 text-[0.72rem] text-[rgba(90,74,66,0.50)]">
                <Check className="h-3 w-3 text-[#8ecb9b]" strokeWidth={2.5} />
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Sticky category filter bar ───────────────────────── */}
      <div className="paper-bg sticky top-[72px] z-30 border-b border-[rgba(90,74,66,0.07)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="container-site">
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map(({ value, label, colour }) => {
              const isActive = activeCategory === value;
              return (
                <button
                  key={value}
                  onClick={() => setActiveCategory(value)}
                  className="whitespace-nowrap rounded-full border px-4 py-1.5 text-[0.75rem] font-bold transition-all duration-150"
                  style={
                    isActive
                      ? { backgroundColor: colour, borderColor: colour, color: "#fff" }
                      : { borderColor: "rgba(90,74,66,0.13)", color: "rgba(90,74,66,0.58)" }
                  }
                >
                  {label}
                </button>
              );
            })}

            <span className="mx-1 h-4 w-px shrink-0 bg-[rgba(90,74,66,0.13)]" aria-hidden="true" />

            {activeCategory !== "all" && (
              <button
                onClick={() => setActiveCategory("all")}
                className="flex items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(90,74,66,0.13)] px-3 py-1.5 text-[0.72rem] font-bold text-[rgba(90,74,66,0.48)] transition hover:text-[var(--ink)]"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}

            <span className="ml-2 shrink-0 text-[0.70rem] text-[rgba(90,74,66,0.38)]">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Product grid ─────────────────────────────────────── */}
      <section className="paper-bg px-4 pb-14 pt-8 sm:px-6 lg:px-8">
        <div className="container-site">
          {loading ? (
            <div className="py-10 text-center text-sm text-[rgba(90,74,66,0.52)]">Loading products...</div>
          ) : error ? (
            <div className="py-10 text-center text-sm text-red-500">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <span className="text-5xl" aria-hidden="true">🌿</span>
              <p className="font-heading text-[1.5rem] text-[var(--ink)]">Nothing here yet</p>
              <button
                onClick={() => setActiveCategory("all")}
                className="text-sm font-bold text-[#5fc8c7] underline underline-offset-2"
              >
                View all products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4 lg:grid-cols-4 xl:grid-cols-5">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>


      {/* ── Bottom info strip ────────────────────────────────── */}
      <section className="blush-bg px-4 py-10 sm:px-6 lg:px-8">
        <div className="container-site">
          <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-heading text-[1.4rem] text-[var(--ink)]">
                Questions about a product?
              </p>
              <p className="mt-1 text-sm text-[rgba(90,74,66,0.60)]">
                Our team is happy to help you choose the right resources for your child.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <PastelButton href="/contact" variant="blush">
                Contact us <ArrowRight className="h-4 w-4" />
              </PastelButton>
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(90,74,66,0.15)] px-5 py-2.5 text-[0.85rem] font-bold text-[rgba(90,74,66,0.65)] transition hover:border-[rgba(90,74,66,0.30)] hover:text-[var(--ink)]"
              >
                <ShoppingCart className="h-4 w-4" /> View cart
              </Link>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
