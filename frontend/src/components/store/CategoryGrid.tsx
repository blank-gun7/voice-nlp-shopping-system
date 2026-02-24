import type { CategoryMeta } from "../../types";
import CategoryCard from "./CategoryCard";

interface CategoryGridProps {
  categories: CategoryMeta[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
      {categories.map((cat) => (
        <CategoryCard key={cat.name} category={cat} />
      ))}
    </div>
  );
}
