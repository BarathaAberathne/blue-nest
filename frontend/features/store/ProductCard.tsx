import Image from "next/image";
import type { Product } from "@/types";

function formatPrice(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="card hover:shadow-md transition-shadow">
      <div className="aspect-square relative bg-gray-100">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl text-gray-300">🛍️</div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 leading-snug">{product.name}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-semibold text-brand-700">{formatPrice(product.price)}</span>
          <button className="btn-primary text-xs py-1.5 px-3">Add to Cart</button>
        </div>
      </div>
    </div>
  );
}
