interface CategoryBadgeProps {
  category: string;
  className?: string;
}

// Simple deterministic colour from category name
function colorClass(category: string): string {
  const map: Record<string, string> = {
    produce: "bg-green-100 text-green-800",
    dairy: "bg-blue-100 text-blue-800",
    meat: "bg-red-100 text-red-800",
    bakery: "bg-amber-100 text-amber-800",
    beverages: "bg-cyan-100 text-cyan-800",
    snacks: "bg-orange-100 text-orange-800",
    frozen: "bg-indigo-100 text-indigo-800",
    pantry: "bg-yellow-100 text-yellow-800",
    seafood: "bg-teal-100 text-teal-800",
    deli: "bg-pink-100 text-pink-800",
    "personal care": "bg-purple-100 text-purple-800",
    household: "bg-stone-100 text-stone-700",
  };
  return map[category.toLowerCase()] ?? "bg-stone-100 text-stone-700";
}

export default function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass(category)} ${className}`}
    >
      {category}
    </span>
  );
}
