import { Link } from "react-router-dom";
import type { CategoryMeta } from "../../types";

interface CategoryCardProps {
  category: CategoryMeta;
}

// Simple emoji mapping by category name
function categoryEmoji(name: string): string {
  const map: Record<string, string> = {
    produce: "🥦",
    dairy: "🥛",
    meat: "🥩",
    bakery: "🍞",
    beverages: "🧃",
    snacks: "🍿",
    frozen: "🧊",
    pantry: "🫙",
    seafood: "🐟",
    deli: "🧀",
    "personal care": "🪥",
    household: "🧹",
    "baby care": "🍼",
    "pet care": "🐾",
  };
  return map[name.toLowerCase()] ?? "🛒";
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link
      to={`/category/${encodeURIComponent(category.name)}`}
      className="flex flex-col items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow active:scale-95"
    >
      <span className="text-3xl">{categoryEmoji(category.name)}</span>
      <span className="text-xs font-semibold text-stone-700 capitalize text-center leading-tight">
        {category.name}
      </span>
      <span className="text-[10px] text-stone-400">{category.count} items</span>
    </Link>
  );
}
