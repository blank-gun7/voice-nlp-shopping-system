import type { Product } from "../../types";
import ProductCard from "./ProductCard";
import SkeletonLoader from "../shared/SkeletonLoader";

interface ProductCardRowProps {
  products: Product[];
  isLoading?: boolean;
}

export default function ProductCardRow({ products, isLoading = false }: ProductCardRowProps) {
  if (isLoading) {
    return <SkeletonLoader variant="card" count={4} />;
  }

  if (products.length === 0) {
    return <p className="text-stone-400 text-sm py-4">No items here yet.</p>;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {products.map((product) => (
        <ProductCard key={product.name_lower} product={product} variant="compact" />
      ))}
    </div>
  );
}
