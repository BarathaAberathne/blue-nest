import type { CategorySlug } from "@/lib/store-cart";

export function categoryFromText(text: string): Exclude<CategorySlug, "all"> {
  const n = text.toLowerCase();
  if (n.includes("holiday club")) return "outdoor";
  if (
    n.includes("clothing") ||
    n.includes("schoolwear") ||
    n.includes("uniform") ||
    n.includes("polo") ||
    n.includes("sweatshirt") ||
    n.includes("t-shirt") ||
    n.includes("tshirt")
  )
    return "clothing";
  if (n.includes("outdoor")) return "outdoor";
  if (n.includes("math")) return "maths";
  if (n.includes("literacy") || n.includes("book")) return "literacy";
  if (n.includes("life")) return "life-skills";
  if (n.includes("art") || n.includes("craft")) return "art";
  if (n.includes("sensory")) return "sensory";
  return "accessories";
}
