import type { CategoryMeta } from "../../types";
import CategoryCard from "./CategoryCard";

interface CategoryGridProps {
  categories: CategoryMeta[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {categories.map((cat) => (
        <CategoryCard key={cat.name} category={cat} />
      ))}
    </div>
  );
}
