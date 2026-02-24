import { useAppContext } from "../../App";
import { useShoppingList } from "../../hooks/useShoppingList";
import type { Product } from "../../types";
import CategoryBadge from "../shared/CategoryBadge";

interface ProductCardProps {
  product: Product;
  /** "compact" for horizontal scroll rows; "grid" for category page */
  variant?: "compact" | "grid";
}

export default function ProductCard({ product, variant = "compact" }: ProductCardProps) {
  const { dispatch } = useAppContext();
  const { addItem } = useShoppingList();

  const handleTap = () => {
    dispatch({ type: "SET_SELECTED_PRODUCT", payload: product });
    dispatch({ type: "SET_PRODUCT_SHEET", payload: true });
  };

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addItem({ item_name: product.name, quantity: 1, category: product.category });
  };

  if (variant === "grid") {
    return (
      <div
        onClick={handleTap}
        className="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-95"
      >
        {/* Product icon placeholder */}
        <div className="w-full aspect-square bg-stone-100 rounded-xl flex items-center justify-center mb-2 text-3xl">
          🛒
        </div>
        <p className="text-sm font-semibold text-stone-800 line-clamp-2 mb-1 capitalize">
          {product.name}
        </p>
        <CategoryBadge category={product.category} className="mb-2" />
        {product.avg_price && (
          <p className="text-xs text-stone-500">${product.avg_price.toFixed(2)}</p>
        )}
        <button
          onClick={handleAdd}
          className="mt-2 w-full py-1.5 bg-green-500 text-white text-xs font-semibold rounded-lg hover:bg-green-600 transition-colors"
        >
          + Add
        </button>
      </div>
    );
  }

  // Compact variant for horizontal scroll
  return (
    <div
      onClick={handleTap}
      className="flex-shrink-0 w-36 bg-white rounded-2xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow active:scale-95"
    >
      <div className="w-full aspect-square bg-stone-100 rounded-xl flex items-center justify-center mb-2 text-3xl">
        🛒
      </div>
      <p className="text-xs font-semibold text-stone-800 line-clamp-2 capitalize mb-1">
        {product.name}
      </p>
      {product.avg_price && (
        <p className="text-xs text-stone-400">${product.avg_price.toFixed(2)}</p>
      )}
      <button
        onClick={handleAdd}
        className="mt-2 w-full py-1 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
      >
        + Add
      </button>
    </div>
  );
}
