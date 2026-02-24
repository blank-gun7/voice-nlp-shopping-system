import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCategoryProducts } from "../hooks/useCategoryProducts";
import SearchVoiceBar from "../components/store/SearchVoiceBar";
import ProductCard from "../components/store/ProductCard";
import SkeletonLoader from "../components/shared/SkeletonLoader";

export default function CategoryPage() {
  const { name = "" } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const categoryName = decodeURIComponent(name);

  const {
    products,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    total,
    loadMore,
  } = useCategoryProducts(categoryName);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 -ml-2 text-stone-600 hover:text-stone-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-stone-800 capitalize">{categoryName}</h1>
          {!isLoading && (
            <p className="text-xs text-stone-400">{total} items</p>
          )}
        </div>
      </div>

      <div className="mb-4">
        <SearchVoiceBar placeholder={`Search in ${categoryName}…`} />
      </div>

      {/* Error state */}
      {error && (
        <div className="py-16 text-center">
          <p className="text-stone-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonLoader key={i} variant="card" count={1} />
          ))}
        </div>
      )}

      {/* Product grid */}
      {!isLoading && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <ProductCard key={product.name_lower} product={product} variant="grid" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && products.length === 0 && !error && (
        <div className="py-16 text-center">
          <p className="text-stone-400">No products found in this category.</p>
        </div>
      )}

      {/* Infinite scroll trigger */}
      <div ref={sentinelRef} className="h-4" />

      {/* Load more indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
