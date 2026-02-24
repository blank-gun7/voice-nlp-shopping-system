/**
 * useCategoryProducts
 *
 * Paginated product fetch for a given category name.
 * Supports infinite scroll via loadMore().
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { Product } from "../types";

export interface UseCategoryProductsReturn {
  products: Product[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  loadMore: () => void;
  hasMore: boolean;
}

export function useCategoryProducts(categoryName: string): UseCategoryProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Reset and fetch page 1 when category changes
  useEffect(() => {
    if (!categoryName) return;

    let cancelled = false;
    setProducts([]);
    setPage(1);
    setError(null);
    setIsLoading(true);

    async function fetchFirst() {
      try {
        const data = await api.getCategory(categoryName, 1);
        if (!cancelled) {
          setProducts(data.products);
          setTotalPages(data.pages);
          setTotal(data.total);
          setPage(1);
        }
      } catch {
        if (!cancelled) setError("Could not load products");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchFirst();
    return () => {
      cancelled = true;
    };
  }, [categoryName]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || page >= totalPages) return;

    const nextPage = page + 1;
    setIsLoadingMore(true);

    api
      .getCategory(categoryName, nextPage)
      .then((data) => {
        setProducts((prev) => [...prev, ...data.products]);
        setPage(nextPage);
        setTotalPages(data.pages);
        setTotal(data.total);
      })
      .catch(() => {
        // Non-fatal — keep existing products
      })
      .finally(() => setIsLoadingMore(false));
  }, [categoryName, isLoadingMore, page, totalPages]);

  return {
    products,
    isLoading,
    isLoadingMore,
    error,
    page,
    totalPages,
    total,
    loadMore,
    hasMore: page < totalPages,
  };
}
