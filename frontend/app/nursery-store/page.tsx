import type { Metadata } from "next";
import PublicLayout from "@/components/layout/PublicLayout";
import PageWrapper from "@/components/ui/PageWrapper";

export const metadata: Metadata = { title: "Nursery Store" };

const placeholderProducts = [
  { name: "Montessori Sensory Kit", price: "£24.99", tag: "Sensory" },
  { name: "Nature Explorer Pack", price: "£18.50", tag: "Outdoor" },
  { name: "Wooden Counting Beads", price: "£12.99", tag: "Maths" },
  { name: "Blue Nest Branded Bag", price: "£9.99", tag: "Accessories" },
  { name: "Story & Song Book Set", price: "£15.99", tag: "Literacy" },
  { name: "Mini Practical Life Set", price: "£29.99", tag: "Life Skills" },
];

export default function NurseryStorePage() {
  return (
    <PublicLayout>
      <PageWrapper>
        <h1 className="section-title mb-2">Nursery Store</h1>
        <p className="section-subtitle max-w-2xl mb-10">
          Montessori-inspired materials, branded merchandise, and home learning resources — handpicked by our educators.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {placeholderProducts.map((p) => (
            <div key={p.name} className="card hover:shadow-md transition-shadow">
              <div className="aspect-square bg-brand-50 flex items-center justify-center text-5xl text-brand-200 rounded-t-2xl">
                🛍️
              </div>
              <div className="p-5">
                <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{p.tag}</span>
                <h3 className="font-medium text-gray-900 mt-2">{p.name}</h3>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-semibold text-brand-700">{p.price}</span>
                  <button className="btn-primary text-xs py-1.5 px-3">Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-10">
          Products connected to live inventory when Stripe integration is complete.
        </p>
      </PageWrapper>
    </PublicLayout>
  );
}
